<?php

use App\Http\Controllers\DemoChatController;
use App\Http\Controllers\DemoKnowledgeController;
use App\Http\Controllers\DemoReviewController;
use App\Http\Controllers\DemoRuleCatalogController;
use Illuminate\Support\Facades\Route;

Route::get('/demo/review', DemoReviewController::class);
Route::get('/demo/knowledge', DemoKnowledgeController::class);
Route::get('/demo/rules', DemoRuleCatalogController::class);
Route::post('/demo/chat', DemoChatController::class)->middleware('throttle:6,1');
