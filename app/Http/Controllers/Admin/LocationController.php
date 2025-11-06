<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;

class LocationController extends Controller
{
    private const BASE_URL = 'https://psgc.gitlab.io/api';
    private const CACHE_TTL = 86400; // 1 day

    public function regions(): JsonResponse
    {
        return $this->fetchAndRespond('/regions/');
    }

    public function provinces(string $regionCode): JsonResponse
    {
        return $this->fetchAndRespond("/regions/{$regionCode}/provinces/");
    }

    public function municipalities(string $provinceCode): JsonResponse
    {
        return $this->fetchAndRespond("/provinces/{$provinceCode}/cities-municipalities/");
    }

    private function fetchAndRespond(string $path): JsonResponse
    {
        $cacheKey = 'locations:' . trim($path, '/');

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($path) {
            try {
                $response = Http::timeout(10)->get(self::BASE_URL . $path);

                if ($response->failed()) {
                    Log::warning('Location API request failed', [
                        'path' => $path,
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                    abort($response->status(), 'Failed to fetch location data');
                }

                return $response->json();
            } catch (\Throwable $e) {
                Log::error('Location API request error', [
                    'path' => $path,
                    'message' => $e->getMessage(),
                ]);
                abort(503, 'Unable to reach location service');
            }
        });

        return response()->json($data);
    }
}
