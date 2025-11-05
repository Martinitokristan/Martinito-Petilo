<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStudentProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id('student_id');
            $table->string('f_name');
            $table->string('m_name')->nullable();
            $table->string('l_name');
            $table->string('suffix')->nullable();
            $table->date('date_of_birth');
            $table->unsignedTinyInteger('age')->nullable();
            $table->enum('sex', ['male', 'female', 'other']);
            $table->string('phone_number');
            $table->string('email_address')->unique();
            $table->text('address');
            $table->enum('status', ['active', 'inactive', 'graduated', 'dropped'])->default('active');
            $table->foreignId('department_id')->constrained('departments', 'department_id')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses', 'course_id')->cascadeOnDelete();
            $table->foreignId('academic_year_id')->nullable()->constrained('academic_years', 'academic_year_id')->nullOnDelete();
            $table->string('year_level', 3)->nullable();
            $table->timestamps();
            $table->timestamp('archived_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('student_profiles');
    }
}
