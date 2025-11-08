<?php

namespace App\Services;

use Google\Client;
use Google\Service\Sheets;
use Google\Service\Exception as GoogleServiceException;
use Google\Service\Sheets\ClearValuesRequest;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GoogleSheetsExportService
{
    protected $client;
    protected $service; // <-- Use only this
    public $spreadsheetId;
    protected $sheetName;

    public function __construct()
    {
        // ✅ Use your actual credentials path
        $credentialsPath = base_path('app/google/service-account.json');

        if (!file_exists($credentialsPath)) {
            throw new \InvalidArgumentException("Credentials file not found at path: {$credentialsPath}");
        }

        $this->client = new Client();
        $this->client->setAuthConfig($credentialsPath);
        $this->client->addScope(Sheets::SPREADSHEETS);

        $this->service = new Sheets($this->client); // <-- Only this

        // ✅ Your Google Sheet ID
        $this->spreadsheetId = '1UGytf-SSjVcb1DWDwFTr9R33m6CNbcYU0R_Wit8sYro';

        // ✅ Use the correct sheet tab name (“Students”)
        $this->sheetName = 'All Students Data';
    }

    public function exportStudentReport($students)
    {
        $this->exportStudentReportToTab($students, $this->sheetName);
    }

    public function exportStudentReportToTab($students, string $sheetName)
    {
        $headers = [
            'student_id', 'f_name', 'm_name', 'l_name', 'suffix',
            'date_of_birth', 'age', 'sex', 'phone_number', 'email_address',
            'address', 'region', 'province', 'municipality', 'status', 'department', 'course',
            'academic_year', 'year_level', 'created_at', 'updated_at', 'archived_at'
        ];

        $rows = [];
        foreach ($students as $student) {
            $rows[] = [
                $student->student_id ?? '',
                $student->f_name ?? '',
                $student->m_name ?? '',
                $student->l_name ?? '',
                $student->suffix ?? '',
                $student->date_of_birth ? date('Y-m-d', strtotime($student->date_of_birth)) : '',
                $this->resolveAge($student->date_of_birth ?? null, $student->age ?? null),
                $student->sex ?? '',
                $student->phone_number ?? '',
                $student->email_address ?? '',
                $student->address ?? '',
                $student->region ?? '',
                $student->province ?? '',
                $student->municipality ?? '',
                $student->status ?? '',
                optional($student->department)->department_name ?? '',
                optional($student->course)->course_name ?? '',
                optional($student->academicYear)->school_year ?? '',
                $student->year_level ?? '',
                $student->created_at ? date('Y-m-d', strtotime($student->created_at)) : '',
                $student->updated_at ? date('Y-m-d', strtotime($student->updated_at)) : '',
                $student->archived_at ? date('Y-m-d', strtotime($student->archived_at)) : '',
            ];
        }

        $this->exportRowsToTab($headers, $rows, $sheetName);
    }

    protected function resolveAge($dateOfBirth, $storedAge)
    {
        if (!empty($storedAge)) {
            return $storedAge;
        }

        if (empty($dateOfBirth)) {
            return '';
        }

        try {
            $birthDate = Carbon::parse($dateOfBirth);
        } catch (\Exception $e) {
            return '';
        }

        return $birthDate->age;
    }

    protected function autoResizeColumns(string $sheetName, int $columnCount): void
    {
        try {
            $spreadsheet = $this->service->spreadsheets->get($this->spreadsheetId);
        } catch (\Exception $e) {
            Log::warning('Unable to retrieve spreadsheet metadata for autoResizeColumns.', [
                'sheet' => $sheetName,
                'error' => $e->getMessage(),
            ]);
            return;
        }

        $sheetId = null;
        foreach ($spreadsheet->getSheets() as $sheet) {
            if ($sheet->getProperties()->getTitle() === $sheetName) {
                $sheetId = $sheet->getProperties()->getSheetId();
                break;
            }
        }

        if ($sheetId === null) {
            Log::warning('autoResizeColumns skipped because sheet was not found.', ['sheet' => $sheetName]);
            return;
        }

        $requests = [
            new Sheets\Request([
                'autoResizeDimensions' => [
                    'dimensions' => [
                        'sheetId' => $sheetId,
                        'dimension' => 'COLUMNS',
                        'startIndex' => 0,
                        'endIndex' => $columnCount,
                    ],
                ],
            ]),
        ];

        $batchUpdateRequest = new Sheets\BatchUpdateSpreadsheetRequest([
            'requests' => $requests,
        ]);

        try {
            $this->service->spreadsheets->batchUpdate($this->spreadsheetId, $batchUpdateRequest);
        } catch (\Exception $e) {
            Log::warning('autoResizeColumns failed.', [
                'sheet' => $sheetName,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function exportFacultyReport($faculties)
    {
        $this->exportFacultyReportToTab($faculties, 'All Faculty Data');
    }

    public function getSpreadsheetId(): string
    {
        return $this->spreadsheetId;
    }

    public function exportFacultyReportToTab($faculties, string $sheetName)
    {
        $headers = [
            'faculty_id', 'f_name', 'm_name', 'l_name', 'suffix',
            'date_of_birth', 'age', 'sex', 'phone_number', 'email_address',
            'address', 'region', 'province', 'municipality', 'position', 'status', 'department',
            'created_at', 'updated_at', 'archived_at'
        ];

        $rows = [];
        foreach ($faculties as $faculty) {
            $rows[] = [
                $faculty->faculty_id ?? '',
                $faculty->f_name ?? '',
                $faculty->m_name ?? '',
                $faculty->l_name ?? '',
                $faculty->suffix ?? '',
                $faculty->date_of_birth ? date('Y-m-d', strtotime($faculty->date_of_birth)) : '',
                $this->resolveAge($faculty->date_of_birth ?? null, $faculty->age ?? null),
                $faculty->sex ?? '',
                $faculty->phone_number ?? '',
                $faculty->email_address ?? '',
                $faculty->address ?? '',
                $faculty->region ?? '',
                $faculty->province ?? '',
                $faculty->municipality ?? '',
                $faculty->position ?? '',
                $faculty->status ?? '',
                optional($faculty->department)->department_name ?? '',
                $faculty->created_at ? date('Y-m-d', strtotime($faculty->created_at)) : '',
                $faculty->updated_at ? date('Y-m-d', strtotime($faculty->updated_at)) : '',
                $faculty->archived_at ? date('Y-m-d', strtotime($faculty->archived_at)) : '',
            ];
        }

        $this->exportRowsToTab($headers, $rows, $sheetName);
    }

    private function ensureSheetExists(string $sheetName): void
    {
        try {
            $spreadsheet = $this->service->spreadsheets->get($this->spreadsheetId);
        } catch (\Exception $e) {
            Log::warning('Unable to load spreadsheet metadata.', ['sheet' => $sheetName, 'error' => $e->getMessage()]);
            throw $e;
        }

        foreach ($spreadsheet->getSheets() as $sheet) {
            if ($sheet->getProperties()->getTitle() === $sheetName) {
                return;
            }
        }

        $request = new Sheets\Request([
            'addSheet' => [
                'properties' => [
                    'title' => $sheetName,
                ],
            ],
        ]);

        $batchUpdateRequest = new Sheets\BatchUpdateSpreadsheetRequest([
            'requests' => [$request],
        ]);

        try {
            $this->service->spreadsheets->batchUpdate($this->spreadsheetId, $batchUpdateRequest);
        } catch (\Exception $e) {
            Log::error('Failed to add sheet.', ['sheet' => $sheetName, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function clearSheet(string $sheetName): void
    {
        try {
            $this->service->spreadsheets_values->clear(
                $this->spreadsheetId,
                $this->buildRange($sheetName),
                new ClearValuesRequest()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to clear sheet before export.', ['sheet' => $sheetName, 'error' => $e->getMessage()]);
        }
    }

    public function exportRowsToTab(array $headers, iterable $rows, string $sheetName): void
    {
        $values = [array_values($headers)];
        foreach ($rows as $row) {
            $values[] = array_map(fn ($value) => $value ?? '', is_array($row) ? array_values($row) : (array) $row);
        }

        $this->ensureSheetExists($sheetName);
        $this->clearSheet($sheetName);

        $body = new Sheets\ValueRange([
            'values' => $values,
        ]);
        $params = ['valueInputOption' => 'RAW'];

        try {
            $this->service->spreadsheets_values->update(
                $this->spreadsheetId,
                $this->buildRange($sheetName, 'A1'),
                $body,
                $params
            );
            $this->autoResizeColumns($sheetName, count($headers));
            Log::info('✅ Rows exported to Google Sheets tab.', ['tab' => $sheetName]);
        } catch (\Exception $e) {
            Log::error('❌ Google Sheets export failed.', ['tab' => $sheetName, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function listSheetTitles(string $spreadsheetId): array
    {
        try {
            $spreadsheet = $this->service->spreadsheets->get($spreadsheetId);
        } catch (\Exception $e) {
            Log::error('Unable to list sheet titles for import.', [
                'spreadsheet_id' => $spreadsheetId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        return array_map(
            fn ($sheet) => $sheet->getProperties()->getTitle(),
            $spreadsheet->getSheets() ?? []
        );
    }

    private function resolveSheetForImport(string $spreadsheetId, string $preferredSheet): string
    {
        $preferredSheet = trim($preferredSheet);
        $fallbackSheet = 'Students';

        $candidates = array_values(array_unique(array_filter([
            $preferredSheet,
            $fallbackSheet,
        ], fn ($value) => $value !== '')));

        $available = $this->listSheetTitles($spreadsheetId);

        foreach ($candidates as $candidate) {
            if (in_array($candidate, $available, true)) {
                return $candidate;
            }
        }

        throw new \RuntimeException('None of the expected sheet tabs were found in the specified spreadsheet.');
    }

    private function buildRange(string $sheetName, ?string $rangePart = null): string
    {
        $trimmed = trim($sheetName);
        if ($trimmed === '') {
            throw new \InvalidArgumentException('Sheet name cannot be empty.');
        }

        $escaped = str_replace("'", "''", $trimmed);
        return "'{$escaped}'" . ($rangePart ? "!{$rangePart}" : '');
    }

    public function importStudentsFromSheet($spreadsheetId, ?string $sheetName = null)
    {
        if (!$spreadsheetId) {
            throw new \Exception("Spreadsheet ID is required");
        }

        $service = $this->service;
        $resolvedSheet = $this->resolveSheetForImport($spreadsheetId, $sheetName ?? $this->sheetName ?? 'Students');
        $range = $this->buildRange($resolvedSheet, 'A2:V');

        $response = $service->spreadsheets_values->get($spreadsheetId, $range);
        $rows = $response->getValues();

        $imported = 0;
        $updated = 0;
        $errors = [];
        $duplicateEmails = [];
        $seenEmails = [];

        foreach ($rows as $index => $row) {
            if (empty(array_filter($row, fn ($value) => $value !== null && $value !== ''))) {
                continue; // skip blank rows
            }

            $originalColumnCount = count($row);
            if ($originalColumnCount < 22) {
                $row = array_pad($row, 22, null);
            }

            $sheetRow = $index + 2; // account for header row in sheet

            $withAgeIdx = [
                'student_id' => 0,
                'f_name' => 1,
                'm_name' => 2,
                'l_name' => 3,
                'suffix' => 4,
                'date_of_birth' => 5,
                'sex' => 7,
                'phone' => 8,
                'email' => 9,
                'address' => 10,
                'region' => 11,
                'province' => 12,
                'municipality' => 13,
                'status' => 14,
                'department' => 15,
                'course' => 16,
                'academic_year' => 17,
                'year_level' => 18,
                'created_at' => 19,
                'updated_at' => 20,
                'archived_at' => 21,
            ];

            $legacyIdx = [
                'student_id' => 0,
                'f_name' => 1,
                'm_name' => 2,
                'l_name' => 3,
                'suffix' => 4,
                'date_of_birth' => 5,
                'sex' => 6,
                'phone' => 7,
                'email' => 8,
                'address' => 9,
                'region' => null,
                'province' => null,
                'municipality' => null,
                'status' => 10,
                'department' => 11,
                'course' => 12,
                'academic_year' => 13,
                'year_level' => 14,
                'created_at' => 15,
                'updated_at' => 16,
                'archived_at' => 17,
            ];

            $sexMap = [
                'male' => 'male',
                'm' => 'male',
                'female' => 'female',
                'f' => 'female',
                'other' => 'other',
                'o' => 'other',
            ];

            $sexCandidateWithAge = strtolower(trim((string) ($row[$withAgeIdx['sex']] ?? '')));
            $sexCandidateLegacy = strtolower(trim((string) ($row[$legacyIdx['sex']] ?? '')));

            if ($sexCandidateWithAge !== '' && isset($sexMap[$sexCandidateWithAge])) {
                $idx = $withAgeIdx;
                $hasAgeColumn = true;
                $rawSex = $sexCandidateWithAge;
            } elseif ($sexCandidateLegacy !== '' && isset($sexMap[$sexCandidateLegacy])) {
                $idx = $legacyIdx;
                $hasAgeColumn = false;
                $rawSex = $sexCandidateLegacy;
            } else {
                $hasAgeColumn = $originalColumnCount >= 19;
                $idx = $hasAgeColumn ? $withAgeIdx : $legacyIdx;
                $rawSex = strtolower(trim((string) ($row[$idx['sex']] ?? '')));
            }

            $department = null;
            $departmentReference = isset($row[$idx['department']]) ? trim((string) $row[$idx['department']]) : null;
            if ($departmentReference !== null && $departmentReference !== '') {
                if (is_numeric($departmentReference)) {
                    $department = \App\Models\Department::find($departmentReference);
                } else {
                    $department = \App\Models\Department::where('department_name', $departmentReference)->first();
                }
            }

            $course = null;
            $courseReference = isset($row[$idx['course']]) ? trim((string) $row[$idx['course']]) : null;
            if ($courseReference !== null && $courseReference !== '') {
                if (is_numeric($courseReference)) {
                    $course = \App\Models\Course::find($courseReference);
                } else {
                    $course = \App\Models\Course::where('course_name', $courseReference)->first();
                }
            }

            $academicYear = null;
            $yearReference = isset($row[$idx['academic_year']]) ? trim((string) $row[$idx['academic_year']]) : null;
            if ($yearReference !== null && $yearReference !== '') {
                if (is_numeric($yearReference)) {
                    $academicYear = \App\Models\AcademicYear::find($yearReference);
                } else {
                    $academicYear = \App\Models\AcademicYear::where('school_year', $yearReference)->first();
                }
            }

            $rawPhone = isset($row[$idx['phone']]) ? trim($row[$idx['phone']]) : '';
            if (preg_match('/^9\d{9}$/', $rawPhone)) {
                $phone_number = '0' . $rawPhone;
            } elseif (preg_match('/^09\d{9}$/', $rawPhone)) {
                $phone_number = $rawPhone;
            } else {
                $phone_number = $rawPhone;
            }

            $rawYearLevel = isset($row[$idx['year_level']]) ? trim((string) $row[$idx['year_level']]) : null;
            $normalizedYearLevel = $rawYearLevel !== null && $rawYearLevel !== ''
                ? strtolower(preg_replace('/\s+/', '', $rawYearLevel))
                : null;
            $yearLevelMap = [
                '1' => '1st',
                '1st' => '1st',
                '2' => '2nd',
                '2nd' => '2nd',
                '3' => '3rd',
                '3rd' => '3rd',
                '4' => '4th',
                '4th' => '4th',
            ];
            $year_level = $normalizedYearLevel !== null && isset($yearLevelMap[$normalizedYearLevel])
                ? $yearLevelMap[$normalizedYearLevel]
                : ($rawYearLevel !== '' ? $rawYearLevel : null);

            $studentId = $row[$idx['student_id']] ?? null;
            $email = strtolower(trim($row[$idx['email']] ?? ''));

            if ($email !== '') {
                if (isset($seenEmails[$email])) {
                    $duplicateEmails[$email] = true;
                    $errors[] = "Duplicate email '{$email}' found in spreadsheet rows {$seenEmails[$email]} and {$sheetRow}.";
                    continue;
                }
                $seenEmails[$email] = $sheetRow;

                $existsQuery = \App\Models\StudentProfile::where('email_address', $email);
                if (!empty($studentId)) {
                    $existsQuery->where('student_id', '!=', $studentId);
                }
                $existingEmailOwner = $existsQuery->first();
                if ($existingEmailOwner) {
                    $duplicateEmails[$email] = true;
                    $errors[] = "Email '{$email}' already belongs to student ID {$existingEmailOwner->student_id}.";
                    continue;
                }
            }

            if ($rawSex === '') {
                $errors[] = "Row {$sheetRow}: Missing sex value.";
                continue;
            }

            $providedSexValue = $row[$idx['sex']] ?? '';
            if (!array_key_exists($rawSex, $sexMap)) {
                $errors[] = "Row {$sheetRow}: Invalid sex value '{$providedSexValue}'. Allowed: male, female, other.";
                continue;
            }

            $studentData = [
                'student_id' => $studentId,
                'f_name' => $row[$idx['f_name']] ?? '',
                'm_name' => $row[$idx['m_name']] ?? '',
                'l_name' => $row[$idx['l_name']] ?? '',
                'suffix' => $row[$idx['suffix']] ?? '',
                'date_of_birth' => $row[$idx['date_of_birth']] ?? null,
                'sex' => $row[$idx['sex']] ?? '',
                'phone_number' => $phone_number,
                'email_address' => $email,
                'address' => $row[$idx['address']] ?? '',
                'region' => $idx['region'] !== null ? ($row[$idx['region']] ?? '') : '',
                'province' => $idx['province'] !== null ? ($row[$idx['province']] ?? '') : '',
                'municipality' => $idx['municipality'] !== null ? ($row[$idx['municipality']] ?? '') : '',
                'status' => $row[$idx['status']] ?? '',
                'department_id' => $department ? $department->department_id : null,
                'course_id' => $course ? $course->course_id : null,
                'academic_year_id' => $academicYear ? $academicYear->academic_year_id : null,
                'year_level' => $year_level,
                'age' => $this->resolveAge($row[$idx['date_of_birth']] ?? null, null),
                'created_at' => $row[$idx['created_at']] ?? null,
                'updated_at' => $row[$idx['updated_at']] ?? null,
                'archived_at' => $row[$idx['archived_at']] ?? null,
            ];

            try {
                $model = \App\Models\StudentProfile::updateOrCreate(
                    ['student_id' => $studentData['student_id']],
                    $studentData
                );

                if ($model->wasRecentlyCreated) {
                    $imported++;
                } else {
                    $updated++;
                }
            } catch (\Throwable $e) {
                $errors[] = "Row {$sheetRow}: " . $e->getMessage();
            }
        }

        return [
            'success' => empty($errors) && empty($duplicateEmails),
            'imported' => $imported,
            'updated' => $updated,
            'duplicates' => array_keys($duplicateEmails),
            'errors' => $errors,
        ];
    }

    public function importFacultyFromSheet(?string $sheetName = null)
    {
        $spreadsheetId = $this->spreadsheetId;
        $service = $this->service;

        $availableSheets = $this->listSheetTitles($spreadsheetId);
        if ($sheetName !== null) {
            $candidate = trim($sheetName);
            if ($candidate === '') {
                throw new \InvalidArgumentException('Sheet name for import cannot be empty.');
            }
            if (!in_array($candidate, $availableSheets, true)) {
                throw new \RuntimeException("Sheet '{$candidate}' was not found in the spreadsheet.");
            }
            $resolvedSheet = $candidate;
        } else {
            $preferred = ['All Faculty Data', 'Faculty'];
            $resolvedSheet = null;

            foreach ($preferred as $candidate) {
                if (in_array($candidate, $availableSheets, true)) {
                    $resolvedSheet = $candidate;
                    break;
                }
            }

            if ($resolvedSheet === null) {
                foreach ($availableSheets as $title) {
                    if (preg_match('/FACULTY$/i', $title)) {
                        $resolvedSheet = $title;
                        break;
                    }
                }
            }

            if ($resolvedSheet === null) {
                throw new \RuntimeException(
                    'Unable to locate a faculty tab in the spreadsheet. Available sheet tabs: ' . implode(', ', $availableSheets)
                );
            }
        }

        $range = $this->buildRange($resolvedSheet, 'A2:Z');

        $response = $service->spreadsheets_values->get($spreadsheetId, $range);
        $rows = $response->getValues();

        $imported = 0;
        $updated = 0;
        $errors = [];
        $duplicateEmails = [];
        $seenEmails = [];

        $normalizeOptional = static function ($value) {
            if ($value === null) {
                return null;
            }

            if (is_string($value)) {
                $value = trim($value);
            }

            return $value === '' ? null : $value;
        };

        foreach ($rows as $index => $row) {
            if (empty(array_filter($row, fn ($value) => $value !== null && $value !== ''))) {
                continue; // skip blank rows
            }

            $originalColumnCount = count($row);
            if ($originalColumnCount < 20) {
                $row = array_pad($row, 20, null);
            }

            $withAgeIdx = [
                'faculty_id' => 0,
                'f_name' => 1,
                'm_name' => 2,
                'l_name' => 3,
                'suffix' => 4,
                'date_of_birth' => 5,
                'age' => 6,
                'sex' => 7,
                'phone' => 8,
                'email' => 9,
                'address' => 10,
                'region' => 11,
                'province' => 12,
                'municipality' => 13,
                'position' => 14,
                'status' => 15,
                'department' => 16,
                'created_at' => 17,
                'updated_at' => 18,
                'archived_at' => 19,
            ];

            $legacyIdx = [
                'faculty_id' => 0,
                'f_name' => 1,
                'm_name' => 2,
                'l_name' => 3,
                'suffix' => 4,
                'date_of_birth' => 5,
                'sex' => 6,
                'phone' => 7,
                'email' => 8,
                'address' => 9,
                'region' => null,
                'province' => null,
                'municipality' => null,
                'position' => 10,
                'status' => 11,
                'department' => 12,
                'created_at' => 13,
                'updated_at' => 14,
                'archived_at' => 15,
            ];

            $sexMap = [
                'male' => 'male',
                'm' => 'male',
                'female' => 'female',
                'f' => 'female',
                'other' => 'other',
                'o' => 'other',
            ];

            $sexCandidateWithAge = strtolower(trim((string) ($row[$withAgeIdx['sex']] ?? '')));
            $sexCandidateLegacy = strtolower(trim((string) ($row[$legacyIdx['sex']] ?? '')));

            if ($sexCandidateWithAge !== '' && isset($sexMap[$sexCandidateWithAge])) {
                $idx = $withAgeIdx;
                $hasAgeColumn = true;
                $rawSex = $sexCandidateWithAge;
            } elseif ($sexCandidateLegacy !== '' && isset($sexMap[$sexCandidateLegacy])) {
                $idx = $legacyIdx;
                $hasAgeColumn = false;
                $rawSex = $sexCandidateLegacy;
            } else {
                $hasAgeColumn = $originalColumnCount >= 20;
                $idx = $hasAgeColumn ? $withAgeIdx : $legacyIdx;
                $rawSex = strtolower(trim((string) ($row[$idx['sex']] ?? '')));
            }

            $normalizedSex = $rawSex !== '' && isset($sexMap[$rawSex]) ? $sexMap[$rawSex] : null;

            $ageValue = null;
            if ($hasAgeColumn) {
                $candidateAge = $row[$withAgeIdx['age']] ?? null;
                if (is_string($candidateAge)) {
                    $candidateAge = trim($candidateAge);
                }
                $ageValue = $candidateAge === '' ? null : $candidateAge;
            }

            $department = null;
            $departmentReference = isset($row[$idx['department']]) ? trim((string) $row[$idx['department']]) : null;
            if ($departmentReference !== null && $departmentReference !== '') {
                if (is_numeric($departmentReference)) {
                    $department = \App\Models\Department::find($departmentReference);
                } else {
                    $department = \App\Models\Department::where('department_name', $departmentReference)->first();
                }
            }

            $rawPhone = isset($row[$idx['phone']]) ? trim($row[$idx['phone']]) : '';
            if (preg_match('/^9\d{9}$/', $rawPhone)) {
                $phone_number = '0' . $rawPhone;
            } elseif (preg_match('/^09\d{9}$/', $rawPhone)) {
                $phone_number = $rawPhone;
            } else {
                $phone_number = $rawPhone;
            }

            $sheetRow = $index + 2;
            $facultyId = $row[$idx['faculty_id']] ?? null;
            $email = strtolower(trim((string) ($row[$idx['email']] ?? '')));

            if ($email !== '') {
                if (isset($seenEmails[$email])) {
                    $duplicateEmails[$email] = true;
                    $errors[] = "Duplicate email '{$email}' found in spreadsheet rows {$seenEmails[$email]} and {$sheetRow}.";
                    continue;
                }
                $seenEmails[$email] = $sheetRow;

                $existsQuery = \App\Models\FacultyProfile::where('email_address', $email);
                if (!empty($facultyId)) {
                    $existsQuery->where('faculty_id', '!=', $facultyId);
                }
                $existingEmailOwner = $existsQuery->first();
                if ($existingEmailOwner) {
                    $duplicateEmails[$email] = true;
                    $errors[] = "Email '{$email}' already belongs to faculty ID {$existingEmailOwner->faculty_id}.";
                    continue;
                }
            }

            if ($normalizedSex === null) {
                $providedSex = trim((string) ($row[$idx['sex']] ?? ''));
                if ($providedSex === '') {
                    $errors[] = "Row {$sheetRow}: Missing sex value.";
                } else {
                    $errors[] = "Row {$sheetRow}: Invalid sex value '{$providedSex}'. Allowed: male, female, other.";
                }
                continue;
            }

            $dateOfBirth = $normalizeOptional($row[$idx['date_of_birth']] ?? null);
            $resolvedAge = $this->resolveAge($dateOfBirth, $ageValue);
            if ($resolvedAge === '') {
                $resolvedAge = null;
            }

            $facultyData = [
                'faculty_id'    => $facultyId,
                'f_name'        => $row[$idx['f_name']] ?? '',
                'm_name'        => $row[$idx['m_name']] ?? '',
                'l_name'        => $row[$idx['l_name']] ?? '',
                'suffix'        => $row[$idx['suffix']] ?? '',
                'date_of_birth' => $dateOfBirth,
                'age'           => $resolvedAge,
                'sex'           => $normalizedSex,
                'phone_number'  => $phone_number,
                'email_address' => $email,
                'address'       => $row[$idx['address']] ?? '',
                'region'        => $idx['region'] !== null ? $normalizeOptional($row[$idx['region']] ?? null) : null,
                'province'      => $idx['province'] !== null ? $normalizeOptional($row[$idx['province']] ?? null) : null,
                'municipality'  => $idx['municipality'] !== null ? $normalizeOptional($row[$idx['municipality']] ?? null) : null,
                'position'      => $row[$idx['position']] ?? '',
                'status'        => $row[$idx['status']] ?? '',
                'department_id' => $department ? $department->department_id : null,
                'created_at'    => $normalizeOptional($row[$idx['created_at']] ?? null),
                'updated_at'    => $normalizeOptional($row[$idx['updated_at']] ?? null),
                'archived_at'   => $normalizeOptional($row[$idx['archived_at']] ?? null),
            ];

            try {
                $model = \App\Models\FacultyProfile::updateOrCreate(
                    ['faculty_id' => $facultyData['faculty_id']],
                    $facultyData
                );
                if ($model->wasRecentlyCreated) {
                    $imported++;
                } else {
                    $updated++;
                }
            } catch (\Throwable $e) {
                $errors[] = "Row {$sheetRow}: " . $e->getMessage();
            }
        }

        return [
            'success' => empty($errors) && empty($duplicateEmails),
            'imported' => $imported,
            'updated' => $updated,
            'duplicates' => array_keys($duplicateEmails),
            'errors' => $errors,
        ];
    }
}