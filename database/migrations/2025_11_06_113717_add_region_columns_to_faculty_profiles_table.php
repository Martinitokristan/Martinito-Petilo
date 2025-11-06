<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddRegionColumnsToFacultyProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('faculty_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('faculty_profiles', 'region')) {
                $table->string('region')->nullable()->after('address');
            }

            if (!Schema::hasColumn('faculty_profiles', 'province')) {
                $table->string('province')->nullable()->after('region');
            }

            if (!Schema::hasColumn('faculty_profiles', 'municipality')) {
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
        Schema::table('faculty_profiles', function (Blueprint $table) {
            $table->dropColumn(['region', 'province', 'municipality']);
        });
    }
}
