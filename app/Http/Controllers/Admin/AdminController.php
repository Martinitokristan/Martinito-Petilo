<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use App\Models\FacultyProfile;
use App\Models\Course;
use App\Models\Department;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('role:admin');
    }

    public function dashboard()
    {
        return view('dashboard');
    }

    public function dashboardJson()
    {
        $currentAcademicYear = $this->getCurrentAcademicYear();
        $courseDistribution = $this->prepareStudentsByCourseData($currentAcademicYear);

        $data = [
            'total_students' => StudentProfile::whereNull('archived_at')->count(),
            'total_faculty' => FacultyProfile::whereNull('archived_at')->count(),
            'total_courses' => Course::whereNull('archived_at')->count(),
            'total_departments' => Department::whereNull('archived_at')->count(),
            'current_academic_year' => optional($currentAcademicYear)->school_year,
            'course_distribution_year' => $courseDistribution['academic_year'],
            'students_by_course' => $courseDistribution['courses'],
            'faculty_by_department' => $this->getFacultyByDepartment(),
            'students_over_time' => $this->getStudentEnrollmentTrend(),
        ];

        return response()->json($data);
    }

    protected function getCurrentAcademicYear(): ?AcademicYear
    {
        return AcademicYear::query()
            ->whereNull('archived_at')
            ->orderByDesc('school_year')
            ->first();
    }

    protected function getStudentsByCourse(?int $academicYearId = null)
    {
        $courses = Course::query()
            ->whereNull('archived_at')
            ->withCount(['students as active_students_count' => function ($query) use ($academicYearId) {
                $query->whereNull('archived_at');

                if ($academicYearId !== null) {
                    $query->where('academic_year_id', $academicYearId);
                }
            }])
            ->orderBy('course_name')
            ->get();

        return $courses->map(fn ($course) => [
            'label' => $course->course_name,
            'count' => (int) ($course->active_students_count ?? 0),
        ]);
    }

    protected function prepareStudentsByCourseData(?AcademicYear $currentAcademicYear): array
    {
        $targetYearId = optional($currentAcademicYear)->academic_year_id;
        $distribution = $this->getStudentsByCourse($targetYearId);
        $totalStudents = $distribution->sum('count');

        if ($totalStudents > 0 || !$currentAcademicYear) {
            return [
                'academic_year' => optional($currentAcademicYear)->school_year,
                'courses' => $distribution,
            ];
        }

        $fallbackYear = AcademicYear::query()
            ->whereNull('archived_at')
            ->where('academic_year_id', '<>', $currentAcademicYear->academic_year_id)
            ->withCount(['students as active_students_count' => function ($query) {
                $query->whereNull('archived_at');
            }])
            ->orderByDesc('school_year')
            ->get()
            ->first(function ($year) {
                return ($year->active_students_count ?? 0) > 0;
            });

        if ($fallbackYear) {
            return [
                'academic_year' => $fallbackYear->school_year,
                'courses' => $this->getStudentsByCourse($fallbackYear->academic_year_id),
            ];
        }

        return [
            'academic_year' => optional($currentAcademicYear)->school_year,
            'courses' => $distribution,
        ];
    }

    protected function getFacultyByDepartment()
    {
        $departments = Department::query()
            ->whereNull('archived_at')
            ->withCount(['faculty as active_faculty_count' => function ($query) {
                $query->whereNull('archived_at');
            }])
            ->orderBy('department_name')
            ->get();

        return $departments->map(fn ($department) => [
            'label' => $department->department_name,
            'count' => (int) ($department->active_faculty_count ?? 0),
        ]);
    }

    protected function getStudentEnrollmentTrend(int $limit = 6)
    {
        $years = AcademicYear::query()
            ->whereNull('archived_at')
            ->withCount(['students as active_students_count' => function ($query) {
                $query->whereNull('archived_at');
            }])
            ->orderBy('school_year')
            ->get();

        $filtered = $years->filter(fn ($year) => ($year->active_students_count ?? 0) > 0);

        if ($filtered->count() > $limit) {
            $filtered = $filtered->slice($filtered->count() - $limit);
        }

        return $filtered->values()->map(fn ($year) => [
            'label' => $year->school_year ?? 'N/A',
            'count' => (int) ($year->active_students_count ?? 0),
        ]);
    }

    public function getProfile()
    {
        $user = auth()->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'created_at' => optional($user->created_at)->toIso8601String(),
                'last_login_at' => optional($user->last_login_at)->toIso8601String(),
                'last_login_agent' => $user->last_login_agent,
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'current_password' => 'required_with:new_password|current_password',
            'new_password' => 'nullable|min:8|confirmed',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if (!empty($validated['current_password']) && !Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'errors' => ['current_password' => ['Current password is incorrect.']],
            ], 422);
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            $user->avatar = $avatarPath;
        }

        $user->first_name = $validated['first_name'];
        $user->last_name = $validated['last_name'];
        $user->email = $validated['email'];
        if (!empty($validated['new_password'])) {
            $user->password = Hash::make($validated['new_password']);
        }
        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'created_at' => optional($user->created_at)->toIso8601String(),
                'last_login_at' => optional($user->last_login_at)->toIso8601String(),
                'last_login_ip' => $user->last_login_ip,
                'last_login_location' => $user->last_login_location,
                'last_login_agent' => $user->last_login_agent,
            ],
        ]);
    }

    public function logout()
    {
        auth()->user()->tokens()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function departments(Request $request)
    {
        try {
            $query = Department::with(['departmentHead' => function ($q) {
                $q->select('faculty_id', 'f_name', 'm_name', 'l_name', 'suffix');
            }]);

            if ($request->has('onlyTrashed')) {
                $query->onlyTrashed();
            } elseif ($request->has('withTrashed')) {
                $query->withTrashed();
            }

            if ($request->has('search')) {
                $search = trim($request->search);
                $query->where('department_name', 'like', "%{$search}%");
            }

            $departments = $query->orderBy('department_name', 'asc')->get();

            // Format the department head name
            $departments->each(function ($dept) {
                Log::info('Department data', ['dept_id' => $dept->department_id, 'dept_name' => $dept->department_name, 'head_id' => $dept->department_head_id, 'has_head' => isset($dept->departmentHead)]);
                if ($dept->departmentHead) {
                    $name = trim(implode(' ', array_filter([
                        $dept->departmentHead->f_name,
                        $dept->departmentHead->m_name,
                        $dept->departmentHead->l_name,
                        $dept->departmentHead->suffix ? ', ' . $dept->departmentHead->suffix : ''
                    ])));
                    $dept->department_head = $name;
                    Log::info('Department head name formatted', ['dept_id' => $dept->department_id, 'name' => $name]);
                } else {
                    $dept->department_head = '-';
                    Log::info('No department head', ['dept_id' => $dept->department_id]);
                }
            });

            return Response::json($departments);
        } catch (\Exception $e) {
            Log::error('Error loading departments: ', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return Response::json(['error' => 'Failed to load departments: ' . $e->getMessage()], 500);
        }
    }
}
