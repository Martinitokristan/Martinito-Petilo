<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddRegionColumnsToStudentProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('student_profiles', 'region')) {
                $table->string('region')->nullable()->after('address');
            }

            if (!Schema::hasColumn('student_profiles', 'province')) {
                $table->string('province')->nullable()->after('region');
            }

            if (!Schema::hasColumn('student_profiles', 'municipality')) {
                $table->string('municipality')->nullable()->after('province');
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
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->dropColumn(['region', 'province', 'municipality']);
        });
    }
}
