<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\StudentProfile;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    private function preparePayload(Request $request): void
    {
        $payload = $request->all();

        $stringFields = [
            'f_name',
            'm_name',
            'l_name',
            'suffix',
            'phone_number',
            'email_address',
            'address',
            'region',
            'province',
            'municipality',
        ];

        foreach ($stringFields as $field) {
            if (array_key_exists($field, $payload) && is_string($payload[$field])) {
                $payload[$field] = trim($payload[$field]);
            }
        }

        $integerFields = ['department_id', 'course_id', 'academic_year_id'];
        foreach ($integerFields as $field) {
            if (array_key_exists($field, $payload) && $payload[$field] !== null && $payload[$field] !== '') {
                $payload[$field] = (int) $payload[$field];
            }
        }

        $request->merge($payload);
    }

    private function normalized(?string $value): string
    {
        return Str::of($value ?? '')->trim()->lower()->__toString();
    }

    private function hasDuplicateStudent(array $data, ?int $ignoreId = null): bool
    {
        if (empty($data['date_of_birth']) || empty($data['f_name']) || empty($data['l_name'])) {
            return false;
        }

        try {
            $dob = Carbon::parse($data['date_of_birth'])->toDateString();
        } catch (\Exception $exception) {
            return false;
        }

        return StudentProfile::query()
            ->when($ignoreId, fn ($query) => $query->where('student_id', '!=', $ignoreId))
            ->whereDate('date_of_birth', $dob)
            ->whereRaw('LOWER(TRIM(f_name)) = ?', [$this->normalized($data['f_name'])])
            ->whereRaw('LOWER(TRIM(l_name)) = ?', [$this->normalized($data['l_name'])])
            ->whereRaw('LOWER(TRIM(COALESCE(m_name, ""))) = ?', [$this->normalized($data['m_name'] ?? '')])
            ->whereRaw('LOWER(TRIM(COALESCE(suffix, ""))) = ?', [$this->normalized($data['suffix'] ?? '')])
            ->exists();
    }

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
            $this->preparePayload($request);

            $departmentRule = Rule::exists('departments', 'department_id')->where(
                fn ($query) => $query->whereNull('archived_at')
            );

            $courseRule = Rule::exists('courses', 'course_id')->where(function ($query) use ($request) {
                $query->whereNull('archived_at');

                if ($request->filled('department_id')) {
                    $query->where('department_id', $request->input('department_id'));
                }
            });

            $academicYearRule = Rule::exists('academic_years', 'academic_year_id')->where(
                fn ($query) => $query->whereNull('archived_at')
            );

            $validated = $request->validate([
                'f_name' => ['required', 'string', 'max:255'],
                'm_name' => ['nullable', 'string', 'max:255'],
                'l_name' => ['required', 'string', 'max:255'],
                'suffix' => ['nullable', 'string', 'max:50'],
                'date_of_birth' => ['required', 'date', 'before:today'],
                'sex' => ['required', Rule::in(['male', 'female', 'other'])],
                'phone_number' => ['required', 'regex:/^09[0-9]{9}$/', 'size:11', Rule::unique('student_profiles', 'phone_number')],
                'email_address' => ['required', 'email', Rule::unique('student_profiles', 'email_address')],
                'address' => ['required', 'string', 'max:1000'],
                'region' => ['required', 'string', 'max:255'],
                'province' => ['required', 'string', 'max:255'],
                'municipality' => ['required', 'string', 'max:255'],
                'status' => ['required', Rule::in(['active', 'inactive', 'graduated', 'dropped'])],
                'department_id' => ['required', 'integer', $departmentRule],
                'course_id' => ['required', 'integer', $courseRule],
                'academic_year_id' => ['nullable', 'integer', $academicYearRule],
                'year_level' => ['required', Rule::in(['1st', '2nd', '3rd', '4th'])],
            ]);

            if ($this->hasDuplicateStudent($validated)) {
                return Response::json([
                    'errors' => [
                        'duplicate' => ['A student with the same full name and birth date already exists.'],
                    ],
                ], 422);
            }

            $validated['age'] = Carbon::parse($validated['date_of_birth'])->age;
            $student = StudentProfile::create($validated);

            return Response::json($student->fresh(['department', 'course', 'academicYear']), 201);
        } catch (ValidationException $e) {
            return Response::json(['errors' => $e->errors()], 422);
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
            $this->preparePayload($request);

            $departmentRule = Rule::exists('departments', 'department_id')->where(
                fn ($query) => $query->whereNull('archived_at')
            );

            $courseRule = Rule::exists('courses', 'course_id')->where(function ($query) use ($request) {
                $query->whereNull('archived_at');

                if ($request->filled('department_id')) {
                    $query->where('department_id', $request->input('department_id'));
                }
            });

            $academicYearRule = Rule::exists('academic_years', 'academic_year_id')->where(
                fn ($query) => $query->whereNull('archived_at')
            );

            $validated = $request->validate([
                'f_name' => ['required', 'string', 'max:255'],
                'm_name' => ['nullable', 'string', 'max:255'],
                'l_name' => ['required', 'string', 'max:255'],
                'suffix' => ['nullable', 'string', 'max:50'],
                'date_of_birth' => ['required', 'date', 'before:today'],
                'sex' => ['required', Rule::in(['male', 'female', 'other'])],
                'phone_number' => ['required', 'regex:/^09[0-9]{9}$/', 'size:11', Rule::unique('student_profiles', 'phone_number')->ignore($id, 'student_id')],
                'email_address' => ['required', 'email', Rule::unique('student_profiles', 'email_address')->ignore($id, 'student_id')],
                'address' => ['required', 'string', 'max:1000'],
                'region' => ['required', 'string', 'max:255'],
                'province' => ['required', 'string', 'max:255'],
                'municipality' => ['required', 'string', 'max:255'],
                'status' => ['required', Rule::in(['active', 'inactive', 'graduated', 'dropped'])],
                'department_id' => ['required', 'integer', $departmentRule],
                'course_id' => ['required', 'integer', $courseRule],
                'academic_year_id' => ['nullable', 'integer', $academicYearRule],
                'year_level' => ['required', Rule::in(['1st', '2nd', '3rd', '4th'])],
            ]);

            if ($this->hasDuplicateStudent($validated, (int) $id)) {
                return Response::json([
                    'errors' => [
                        'duplicate' => ['A student with the same full name and birth date already exists.'],
                    ],
                ], 422);
            }

            $validated['age'] = Carbon::parse($validated['date_of_birth'])->age;
            $student->update($validated);

            $updatedStudent = $student->fresh(['department', 'course', 'academicYear']);

            return Response::json($updatedStudent, 200);
        } catch (ValidationException $e) {
            return Response::json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error updating student: ', ['message' => $e->getMessage()]);
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