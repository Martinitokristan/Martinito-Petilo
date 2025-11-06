<?php

namespace App\Http\Controllers\Admin;

use App\Models\StudentProfile;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        try {
            Log::info('Loading students with request: ', $request->all());
            $query = StudentProfile::with([
                'department' => function ($q) {
                    $q->select('department_id', 'department_name');
                },
                'course' => function ($q) {
                    $q->select('course_id', 'course_name');
                },
                'academicYear' => function ($q) {
                    $q->select('academic_year_id', 'school_year');
                }
            ])->select(
                'student_id',
                'f_name',
                'm_name',
                'l_name',
                'suffix',
                'date_of_birth',
                'age',
                'sex',
                'phone_number',
                'email_address',
                'address',
                'status',
                'department_id',
                'course_id',
                'academic_year_id',
                'year_level',
                'region',
                'province',
                'municipality',
                'archived_at'
            );

            if (!$request->has('withTrashed')) {
                $query->whereNull('archived_at');
            } elseif ($request->has('withTrashed')) {
                $query->withTrashed();
            }

            if ($request->has('search')) {
                $search = trim($request->search);
                $query->where(function ($q) use ($search) {
                    $q->where('l_name', 'like', "%{$search}%")
                      ->orWhere('f_name', 'like', "%{$search}%");
                });
            }
            if ($request->has('department_id')) {
                $query->where('department_id', $request->department_id);
            }
            if ($request->has('course_id')) {
                $query->where('course_id', $request->course_id);
            }
            if ($request->has('academic_year_id')) {
                $query->where('academic_year_id', $request->academic_year_id);
            }

            $students = $query->orderBy('l_name', 'asc')->get();
            Log::info('Students loaded successfully: ', ['count' => $students->count()]);
            return Response::json($students);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Database error loading students: ', ['message' => $e->getMessage(), 'sql' => $e->getSql(), 'bindings' => $e->getBindings(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Database error: ' . $e->getMessage()], 500);
        } catch (\Exception $e) {
            Log::error('General error loading students: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to load students: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'f_name' => 'required|string|max:255',
                'm_name' => 'nullable|string|max:255',
                'l_name' => 'required|string|max:255',
                'suffix' => 'nullable|string|max:50',
                'date_of_birth' => 'required|date',
                'age' => 'nullable|integer|min:0|max:150',
                'sex' => 'required|in:male,female,other',
                'phone_number' => 'required|regex:/^09[0-9]{9}$/|size:11',
                'email_address' => 'required|email|unique:student_profiles,email_address',
                'address' => 'required|string|max:1000',
                'region' => 'required|string|max:255',
                'province' => 'required|string|max:255',
                'municipality' => 'required|string|max:255',
                'status' => 'required|in:active,inactive,graduated,dropped',
                'department_id' => 'required|exists:departments,department_id',
                'course_id' => 'required|exists:courses,course_id',
                'academic_year_id' => 'nullable|exists:academic_years,academic_year_id',
                'year_level' => 'required|in:1st,2nd,3rd,4th',
            ]);

            $validated['age'] = Carbon::parse($validated['date_of_birth'])->age;
            $student = StudentProfile::create($validated);
            return Response::json($student->fresh(['department', 'course', 'academicYear']), 201);
        } catch (\Exception $e) {
            Log::error('Error creating student: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to create student: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        try {
            $student = StudentProfile::with(['department', 'course', 'academicYear'])->findOrFail($id);
            return Response::json($student);
        } catch (\Exception $e) {
            Log::error('Error showing student: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Student not found: ' . $e->getMessage()], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $student = StudentProfile::findOrFail($id);

            $validated = $request->validate([
                'f_name' => 'required|string|max:255',
                'm_name' => 'nullable|string|max:255', // 
                'l_name' => 'required|string|max:255',
                'suffix' => 'nullable|string|max:50', // 
                'date_of_birth' => 'required|date',
                'age' => 'nullable|integer|min:0|max:150',
                'sex' => 'required|in:male,female,other',
                'phone_number' => 'required|regex:/^09[0-9]{9}$/|size:11',
                'email_address' => 'required|email|unique:student_profiles,email_address,' . $id . ',student_id',
                'address' => 'required|string|max:1000',
                'region' => 'required|string|max:255',
                'province' => 'required|string|max:255',
                'municipality' => 'required|string|max:255',
                'status' => 'required|in:active,inactive,graduated,dropped',
                'department_id' => 'required|exists:departments,department_id',
                'course_id' => 'required|exists:courses,course_id',
                'academic_year_id' => 'nullable|exists:academic_years,academic_year_id',
                'year_level' => 'required|in:1st,2nd,3rd,4th',
            ]);

            $validated['age'] = Carbon::parse($validated['date_of_birth'])->age;
            $student->update($validated);

            // ✅ Force reload with updated values & relations
            $updatedStudent = $student->fresh(['department', 'course', 'academicYear']);

            return Response::json($updatedStudent, 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return Response::json(['error' => $e->errors()], 422);
        } catch (\Exception $e) {
            \Log::error('Error updating student: ', ['message' => $e->getMessage()]);
            return Response::json(['error' => 'Failed to update student: ' . $e->getMessage()], 500);
        }
    }

    public function archive($id)
    {
        try {
            $student = StudentProfile::findOrFail($id);
            $student->delete();
            return Response::json(['message' => 'Student archived'], 200);
        } catch (\Exception $e) {
            Log::error('Error archiving student: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to archive student: ' . $e->getMessage()], 500);
        }
    }

    public function restore($id)
    {
        try {
            $student = StudentProfile::withTrashed()->findOrFail($id);
            $student->restore();
            return Response::json(['message' => 'Student restored'], 200);
        } catch (\Exception $e) {
            Log::error('Error restoring student: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to restore student: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $student = StudentProfile::withTrashed()->findOrFail($id);
            $student->forceDelete();
            return Response::json(['message' => 'Student permanently deleted'], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting student permanently: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to delete student permanently: ' . $e->getMessage()], 500);
        }
    }
}