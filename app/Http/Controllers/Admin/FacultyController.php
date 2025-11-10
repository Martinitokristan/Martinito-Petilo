<?php

namespace App\Http\Controllers\Admin;

use App\Models\FacultyProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;

class FacultyController extends Controller
{
    public function index(Request $request)
    {
        try {
            Log::info('Loading faculty with request: ', $request->all());
            $query = FacultyProfile::with([
                'department' => function ($q) {
                    $q->select('department_id', 'department_name');
                },
            ])->select(
                'faculty_id',
                'f_name',
                'm_name',
                'l_name',
                'suffix',
                'date_of_birth',
                'sex',
                'phone_number',
                'email_address',
                'address',
                'region',
                'province',
                'municipality',
                'department_id',
                'position',
                'status',
                'archived_at'
            );

            if ($request->has('onlyTrashed')) {
                $query->onlyTrashed();
            } elseif ($request->has('withTrashed')) {
                $query->withTrashed();
            }

            if ($request->has('search')) {
                $search = trim($request->search);
                $query->where(function ($q) use ($search) {
                    $q->where('l_name', 'like', "%{$search}%")
                      ->orWhere('f_name', 'like', "%{$search}%")
                      ->orWhere('email_address', 'like', "%{$search}%");
                });
            }
            if ($request->has('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            $faculty = $query->orderBy('l_name', 'asc')->get();
            Log::info('Faculty loaded successfully: ', ['count' => $faculty->count()]);
            return Response::json($faculty);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Database error loading faculty: ', ['message' => $e->getMessage(), 'sql' => $e->getSql(), 'bindings' => $e->getBindings(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Database error: ' . $e->getMessage()], 500);
        } catch (\Exception $e) {
            Log::error('General error loading faculty: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString(), 'request' => $request->all()]);
            return Response::json(['error' => 'Failed to load faculty: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'f_name' => 'required|string|max:255',
                'm_name' => 'nullable|string|max:255',
                'l_name' => 'required|string|max:255',
                'suffix' => 'nullable|string|max:10',
                'date_of_birth' => 'required|date',
                'sex' => 'required|in:male,female,other',
                'phone_number' => 'required|regex:/^09[0-9]{9}$/|size:11',
                'email_address' => 'required|email|unique:faculty_profiles,email_address',
                'address' => 'required|string|max:1000',
                'region' => 'required|string|max:255',
                'province' => 'required|string|max:255',
                'municipality' => 'required|string|max:255',
                'department_id' => 'nullable|exists:departments,department_id',
                'position' => 'nullable|in:Dean,Instructor,Part-time,Department Head',
                'status' => 'nullable|in:active,inactive'
            ]);

            $faculty = FacultyProfile::create($validated);
            
            // If position is Department Head, update the department's department_head_id
            if (isset($validated['position']) && $validated['position'] === 'Department Head' && isset($validated['department_id'])) {
                try {
                    // Clear any existing department head for this department
                    \App\Models\Department::where('department_id', $validated['department_id'])
                        ->update(['department_head_id' => $faculty->faculty_id]);
                    
                    // Ensure no other faculty is set as Department Head for this department
                    FacultyProfile::where('department_id', $validated['department_id'])
                        ->where('faculty_id', '!=', $faculty->faculty_id)
                        ->where('position', 'Department Head')
                        ->update(['position' => 'Instructor']);
                    
                    Log::info('Department head assigned automatically', ['department_id' => $validated['department_id'], 'faculty_id' => $faculty->faculty_id]);
                } catch (\Exception $e) {
                    Log::error('Error auto-assigning department head: ', ['message' => $e->getMessage()]);
                }
            }
            
            return Response::json($faculty, 201);
        } catch (\Exception $e) {
            Log::error('Error creating faculty: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString(), 'request' => $request->all()]);
            return Response::json(['error' => 'Failed to create faculty: ' . $e->getMessage(), 'details' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        try {
            $faculty = FacultyProfile::with('department')->findOrFail($id);
            
            // If position is Department Head, update the department's department_head_id
            if ($faculty->position === 'Department Head' && $faculty->department_id) {
                try {
                    // Clear any existing department head for this department
                    \App\Models\Department::where('department_id', $faculty->department_id)
                        ->update(['department_head_id' => $id]);
                    
                    // Ensure no other faculty is set as Department Head for this department
                    FacultyProfile::where('department_id', $faculty->department_id)
                        ->where('faculty_id', '!=', $id)
                        ->where('position', 'Department Head')
                        ->update(['position' => 'Instructor']);
                    
                    Log::info('Department head assigned automatically', ['department_id' => $faculty->department_id, 'faculty_id' => $id]);
                } catch (\Exception $e) {
                    Log::error('Error auto-assigning department head: ', ['message' => $e->getMessage()]);
                }
            }
            
            return Response::json($faculty);
        } catch (\Exception $e) {
            Log::error('Error showing faculty: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Faculty not found: ' . $e->getMessage()], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $faculty = FacultyProfile::findOrFail($id);
            $validated = $request->validate([
                'f_name' => 'required|string|max:255',
                'm_name' => 'nullable|string|max:255',
                'l_name' => 'required|string|max:255',
                'suffix' => 'nullable|string|max:10',
                'date_of_birth' => 'required|date',
                'sex' => 'required|in:male,female,other',
                'phone_number' => 'required|regex:/^09[0-9]{9}$/|size:11',
                'email_address' => 'required|email|unique:faculty_profiles,email_address,' . $id . ',faculty_id',
                'address' => 'required|string|max:1000',
                'region' => 'required|string|max:255',
                'province' => 'required|string|max:255',
                'municipality' => 'required|string|max:255',
                'department_id' => 'nullable|exists:departments,department_id',
                'position' => 'nullable|in:Dean,Instructor,Part-time,Department Head',
                'status' => 'nullable|in:active,inactive'
            ]);

            $statusIsInactive = ($validated['status'] ?? null) === 'inactive';
            $departmentChanged = array_key_exists('department_id', $validated)
                ? (int) ($faculty->department_id ?? 0) !== (int) ($validated['department_id'] ?? 0)
                : false;

            if ($statusIsInactive && $departmentChanged && $validated['department_id']) {
                $newDepartment = Department::withTrashed()->find($validated['department_id']);
                if ($newDepartment && is_null($newDepartment->archived_at)) {
                    $validated['status'] = 'active';
                }
            }

            $faculty->update($validated);
            
            // If position is Department Head, update the department's department_head_id
            if (isset($validated['position']) && $validated['position'] === 'Department Head' && isset($validated['department_id'])) {
                try {
                    // Clear any existing department head for this department
                    \App\Models\Department::where('department_id', $validated['department_id'])
                        ->update(['department_head_id' => $id]);
                    
                    // Ensure no other faculty is set as Department Head for this department
                    FacultyProfile::where('department_id', $validated['department_id'])
                        ->where('faculty_id', '!=', $id)
                        ->where('position', 'Department Head')
                        ->update(['position' => 'Instructor']);
                    
                    Log::info('Department head assigned automatically', ['department_id' => $validated['department_id'], 'faculty_id' => $id]);
                } catch (\Exception $e) {
                    Log::error('Error auto-assigning department head: ', ['message' => $e->getMessage()]);
                }
            } elseif (isset($validated['position']) && $validated['position'] !== 'Department Head') {
                // If position changed from Department Head to something else, clear department_head_id
                try {
                    \App\Models\Department::where('department_head_id', $id)
                        ->update(['department_head_id' => null]);
                    Log::info('Department head cleared', ['faculty_id' => $id]);
                } catch (\Exception $e) {
                    Log::error('Error clearing department head: ', ['message' => $e->getMessage()]);
                }
            }
            
            return Response::json($faculty);
        } catch (\Exception $e) {
            Log::error('Error updating faculty: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to update faculty: ' . $e->getMessage(), 'details' => $e->getMessage()], 500);
        }
    }

    public function archive($id)
    {
        try {
            $faculty = FacultyProfile::findOrFail($id);
            $faculty->delete();
            
            // If position is Department Head, clear the department's department_head_id
            if ($faculty->position === 'Department Head' && $faculty->department_id) {
                try {
                    \App\Models\Department::where('department_id', $faculty->department_id)
                        ->update(['department_head_id' => null]);
                    Log::info('Department head cleared', ['faculty_id' => $id]);
                } catch (\Exception $e) {
                    Log::error('Error clearing department head: ', ['message' => $e->getMessage()]);
                }
            }
            
            return Response::json(['message' => 'Faculty archived'], 200);
        } catch (\Exception $e) {
            Log::error('Error archiving faculty: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to archive faculty: ' . $e->getMessage()], 500);
        }
    }

    public function restore($id)
    {
        try {
            $faculty = FacultyProfile::withTrashed()->findOrFail($id);
            $faculty->restore();
            return Response::json(['message' => 'Faculty restored'], 200);
        } catch (\Exception $e) {
            Log::error('Error restoring faculty: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to restore faculty: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $faculty = FacultyProfile::withTrashed()->findOrFail($id);

            if ($faculty->position === 'Department Head' && $faculty->department_id) {
                \App\Models\Department::where('department_id', $faculty->department_id)
                    ->where('department_head_id', $faculty->faculty_id)
                    ->update(['department_head_id' => null]);
            }

            $faculty->forceDelete();

            return Response::json(['message' => 'Faculty permanently deleted'], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting faculty permanently: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to delete faculty permanently: ' . $e->getMessage()], 500);
        }
    }
}