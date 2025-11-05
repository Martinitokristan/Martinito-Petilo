<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDepartmentsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id('department_id');
            $table->string('department_name');
            $table->unsignedBigInteger('department_head_id')->nullable();
            $table->timestamps();
            $table->timestamp('archived_at')->nullable();
        });

        Schema::table('courses', function (Blueprint $table) {
            if (Schema::hasColumn('courses', 'department_id')) {
                $table->foreign('department_id')
                    ->references('department_id')
                    ->on('departments')
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
        Schema::table('courses', function (Blueprint $table) {
            if (Schema::hasColumn('courses', 'department_id')) {
                $table->dropForeign(['department_id']);
            }
        });

        Schema::dropIfExists('departments');
    }
}
