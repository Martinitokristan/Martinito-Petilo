<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class DropLastLoginIpColumnsFromUsersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $columnsToDrop = array_filter([
            'last_login_ip',
            'last_login_location',
        ], fn ($column) => Schema::hasColumn('users', $column));

        if (empty($columnsToDrop)) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($columnsToDrop) {
            $table->dropColumn($columnsToDrop);
        });
    }

    public function down()
    {
        $shouldAddIp = ! Schema::hasColumn('users', 'last_login_ip');
        $shouldAddLocation = ! Schema::hasColumn('users', 'last_login_location');

        if (! $shouldAddIp && ! $shouldAddLocation) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($shouldAddIp, $shouldAddLocation) {
            if ($shouldAddIp) {
                $table->string('last_login_ip', 64)->nullable();
            }

            if ($shouldAddLocation) {
                $table->string('last_login_location', 255)->nullable();
            }
        });
    }
}