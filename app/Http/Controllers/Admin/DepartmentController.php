<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Department::with([
                'departmentHead' => function ($q) {
                    $q->select('faculty_id', 'f_name', 'm_name', 'l_name', 'suffix');
                },
                'faculty' => function ($q) {
                    $q->select('faculty_id', 'f_name', 'm_name', 'l_name', 'suffix', 'position', 'department_id', 'archived_at');
                },
            ]);
            
            $departments = $query->get();
            
            // Format the department head name and expose assignment availability
            $departments->each(function ($dept) {
                if ($dept->departmentHead) {
                    $dept->department_head = trim(implode(' ', array_filter([
                        $dept->departmentHead->f_name,
                        $dept->departmentHead->m_name,
                        $dept->departmentHead->l_name,
                        $dept->departmentHead->suffix ? ', ' . $dept->departmentHead->suffix : ''
                    ])));
                } else {
                    $dept->department_head = '——————';
                }

                $activeFaculty = $dept->faculty->whereNull('archived_at');
                $currentDeans = $activeFaculty->where('position', 'Dean')->pluck('faculty_id');

                $dept->has_department_head = (bool) $dept->departmentHead;
                $dept->current_department_head_id = $dept->departmentHead->faculty_id ?? null;
                $dept->has_dean = $currentDeans->isNotEmpty();
                $dept->current_dean_ids = $currentDeans->values();

                unset($dept->departmentHead);
                unset($dept->faculty);
            });
            
            return response()->json($departments);
        } catch (\Exception $e) {
            \Log::error('Error loading departments: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Failed to load departments: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_name' => 'required|string|max:255|unique:departments,department_name',
            'department_head' => 'nullable|string|max:255',
        ]);

        $department = Department::create($validated);
        return response()->json($department, 201);
    }

    public function show($id)
    {
        $department = Department::findOrFail($id);
        return response()->json($department);
    }

    public function update(Request $request, $id)
    {
        $department = Department::findOrFail($id);

        $validated = $request->validate([
            'department_name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('departments', 'department_name')->ignore($department->department_id, 'department_id'),
            ],
            'department_head' => 'nullable|string|max:255',
        ]);

        $department->update($validated);
        return response()->json($department);
    }

    public function archive(Request $request, $id)
    {
        $department = Department::findOrFail($id);
        if ($department->trashed()) {
            return response()->json(['message' => 'Already archived'], 200);
        }
        
        // Set all faculty members in this department to inactive
        \App\Models\FacultyProfile::where('department_id', $id)
            ->whereNull('archived_at')
            // mark inactive but keep position in DB (do not null position)
            ->update(['status' => 'inactive']);
        
        // Set all students in this department to inactive
        \App\Models\StudentProfile::where('department_id', $id)
            ->whereNull('archived_at')
            ->update(['status' => 'inactive']);
        
        // Archive all courses in this department
        \App\Models\Course::where('department_id', $id)
            ->whereNull('archived_at')
            ->delete();
        
        // Clear department_head_id so we don't leave a stale reference
        $department->update(['department_head_id' => null]);

        $department->delete(); // Uses SoftDeletes with archived_at
        return response()->json(['message' => 'Department archived successfully']);
    }

    public function restore(Request $request, $id)
    {
        $department = Department::withTrashed()->findOrFail($id);
        if (!$department->trashed()) {
            return response()->json(['message' => 'Not archived'], 200);
        }
        
        // Get all course IDs that will be restored
        $courseIds = \App\Models\Course::onlyTrashed()
            ->where('department_id', $id)
            ->pluck('course_id');
        
        // Restore all courses in this department
        \App\Models\Course::onlyTrashed()
            ->where('department_id', $id)
            ->restore();
        
        // Set all faculty members in this department back to active
        \App\Models\FacultyProfile::where('department_id', $id)
            ->whereNull('archived_at')
            ->update(['status' => 'active']);
        
        // Set all students in this department back to active
        // This includes students in the restored courses
        \App\Models\StudentProfile::where('department_id', $id)
            ->whereNull('archived_at')
            ->update(['status' => 'active']);
        
        // Also reactivate students who are in the restored courses
        // (in case they were made inactive when the course was archived)
        if ($courseIds->isNotEmpty()) {
            \App\Models\StudentProfile::whereIn('course_id', $courseIds)
                ->whereNull('archived_at')
                ->update(['status' => 'active']);
        }
        
        $department->restore();
        return response()->json($department->fresh());
    }

    public function destroy($id)
    {
        $department = Department::withTrashed()->findOrFail($id);

        DB::transaction(function () use ($department) {
            $departmentId = $department->department_id;

            \App\Models\Course::withTrashed()
                ->where('department_id', $departmentId)
                ->each(function ($course) {
                    \App\Models\StudentProfile::withTrashed()
                        ->where('course_id', $course->course_id)
                        ->forceDelete();

                    $course->forceDelete();
                });

            \App\Models\StudentProfile::withTrashed()
                ->where('department_id', $departmentId)
                ->forceDelete();

            \App\Models\FacultyProfile::withTrashed()
                ->where('department_id', $departmentId)
                ->forceDelete();

            $department->forceDelete();
        });

        return response()->json(['message' => 'Department permanently deleted'], 200);
    }
}