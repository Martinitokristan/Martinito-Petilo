<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\CourseController;
use App\Http\Controllers\Admin\AcademicYearController;
use App\Http\Controllers\Admin\ArchiveController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\FacultyController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\DepartmentHeadController;
use App\Http\Controllers\Admin\LocationController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Dashboard and Profile endpoints
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboardJson']);
    Route::get('/profile', [AdminController::class, 'getProfile']);
    Route::put('/profile', [AdminController::class, 'updateProfile']);
    Route::post('/logout', [AdminController::class, 'logout']);

    Route::prefix('admin')->group(function () {
        Route::get('/locations/regions', [LocationController::class, 'regions']);
        Route::get('/locations/regions/{region}/provinces', [LocationController::class, 'provinces']);
        Route::get('/locations/provinces/{province}/municipalities', [LocationController::class, 'municipalities']);

        // Department API Resource
        Route::apiResource('departments', DepartmentController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::post('/departments/{department}/archive', [DepartmentController::class, 'archive']);
        Route::post('/departments/{department}/restore', [DepartmentController::class, 'restore']);

        // Course API Resource
        Route::apiResource('courses', CourseController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::post('/courses/{course}/archive', [CourseController::class, 'archive']);
        Route::post('/courses/{course}/restore', [CourseController::class, 'restore']);

        // Academic Year API Resource
        Route::apiResource('academic-years', AcademicYearController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::post('/academic-years/{academic_year}/archive', [AcademicYearController::class, 'archive']);
        Route::post('/academic-years/{academic_year}/restore', [AcademicYearController::class, 'restore']);

        // Student API Resource
        Route::apiResource('students', StudentController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::post('/students/{student}/archive', [StudentController::class, 'archive']);
        Route::post('/students/{student}/restore', [StudentController::class, 'restore']);

        // Faculty API Resource
        Route::apiResource('faculty', FacultyController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::post('/faculty/{faculty}/archive', [FacultyController::class, 'archive']);
        Route::post('/faculty/{faculty}/restore', [FacultyController::class, 'restore']);

        // Reports
        Route::prefix('reports')->name('reports.')->group(function () {
            Route::get('/options', [ReportController::class, 'getOptions'])->name('options');

            Route::post('/students', [ReportController::class, 'generateStudentReport'])->name('students.generate');
            Route::post('/students/import', [ReportController::class, 'importStudentReport'])->name('students.import');
            Route::post('/faculty', [ReportController::class, 'generateFacultyReport'])->name('faculty.generate');
            Route::post('/faculty/import', [ReportController::class, 'importFacultyReport'])->name('faculty.import');
        });

        // Archived items
        Route::get('/archived', [ArchiveController::class, 'index']);
    });
});

Route::get('/courses', [CourseController::class, 'index']);
Route::get('/departments', [DepartmentController::class, 'index']);
Route::get('/report/options', [ReportController::class, 'getOptions']);
Route::post('/admin/reports/students', [ReportController::class, 'generateStudentReport']);
Route::post('/admin/reports/faculty', [ReportController::class, 'generateFacultyReport']);
Route::post('/export-to-sheets', [ReportController::class, 'exportToSheets']);
Route::post('/admin/reports/import-students', [\App\Http\Controllers\Admin\ReportController::class, 'importStudentReport']);
Route::post('/admin/reports/import-faculty', [\App\Http\Controllers\Admin\ReportController::class, 'importFacultyReport']);