<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFacultyProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('faculty_profiles', function (Blueprint $table) {
            $table->id('faculty_id');
            $table->string('f_name');
            $table->string('m_name')->nullable();
            $table->string('l_name');
            $table->string('suffix')->nullable();
            $table->date('date_of_birth');
            $table->unsignedTinyInteger('age')->nullable();
            $table->enum('sex', ['male', 'female', 'other']);
            $table->string('phone_number');
            $table->string('email_address');
            $table->text('address');
            $table->string('region')->nullable();
            $table->string('province')->nullable();
            $table->string('municipality')->nullable();
            $table->enum('status', ['active', 'inactive', 'graduated', 'dropped'])->default('active');
            $table->enum('position', ['Dean', 'Instructor', 'Part-time', 'Department Head'])->nullable();
            $table->foreignId('department_id')->constrained('departments', 'department_id')->cascadeOnDelete();
            $table->timestamps();
            $table->timestamp('archived_at')->nullable();
        });

        Schema::table('departments', function (Blueprint $table) {
            if (Schema::hasColumn('departments', 'department_head_id')) {
                $table->foreign('department_head_id')
                    ->references('faculty_id')
                    ->on('faculty_profiles')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('departments', function (Blueprint $table) {
            if (Schema::hasColumn('departments', 'department_head_id')) {
                $table->dropForeign(['department_head_id']);
            }
        });

        Schema::dropIfExists('faculty_profiles');
    }
}
