<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class ClearLocationCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'location:clear-cache';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all location caches (regions, provinces, municipalities)';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Clearing location caches...');
        
        // Clear regions cache - this is the main cache that controls the rest
        Cache::forget('locations:regions');
        
        
        $this->info('Location caches cleared successfully!');
        $this->info('Note: Province and municipality caches will refresh on next access');
        
        return 0;
    }
}
