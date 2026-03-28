<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Traits\ApiResponseTrait;

class NotepadController extends Controller
{
    use ApiResponseTrait;

    /**
     * Note: This implementation uses session storage for "Secure Notepad".
     * In a distributed environment, this could be moved to Redis with a short TTL.
     */
    public function getNote(Request $request)
    {
        $note = $request->session()->get('secure_note', '');
        return $this->successResponse(['note' => $note]);
    }

    public function updateNote(Request $request)
    {
        $request->validate(['note' => 'nullable|string|max:5000']);
        $request->session()->put('secure_note', $request->note);
        return $this->successResponse(null, 'Note updated');
    }

    public function clearNote(Request $request)
    {
        $request->session()->forget('secure_note');
        return $this->successResponse(null, 'Note cleared');
    }
}
