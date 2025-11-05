<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class FacultyProfile extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'faculty_id';
    public $incrementing = true;
    protected $keyType = 'int';

    const DELETED_AT = 'archived_at';

    protected $table = 'faculty_profiles'; // Ensure this line is present and correct

    protected $fillable = [
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
        'department_id',
        'position',
        'status'
    ];

    protected $dates = ['archived_at'];

    protected static function booted(): void
    {
        static::saving(function (FacultyProfile $profile) {
            if ($profile->date_of_birth) {
                $profile->age = Carbon::parse($profile->date_of_birth)->age;
            }
        });
    }

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }
}