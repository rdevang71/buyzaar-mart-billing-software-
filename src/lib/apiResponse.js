import { NextResponse } from 'next/server';

export function successResponse(data, message = 'Success', status = 200) {
  return NextResponse.json(
    { success: true, message, data },
    { status }
  );
}

export function errorResponse(message = 'Something went wrong', status = 500, errors = null) {
  return NextResponse.json(
    { success: false, message, errors },
    { status }
  );
}

export function notFound(message = 'Record not found') {
  return errorResponse(message, 404);
}

export function validationError(errors) {
  return errorResponse('Validation failed', 422, errors);
}