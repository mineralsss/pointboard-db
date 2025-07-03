# Authentication Error Codes

This document outlines the specific error codes returned by the authentication API endpoints.

## Login Error Codes

### Invalid Credentials
- **Error Code**: `INVALID_CREDENTIALS`
- **Error Type**: `authentication_error`
- **HTTP Status**: 401
- **Message**: "Invalid email or password"
- **Description**: Returned when the email doesn't exist or the password is incorrect

### Account Not Verified
- **Error Code**: `ACCOUNT_NOT_VERIFIED`
- **Error Type**: `verification_error`
- **HTTP Status**: 403
- **Message**: "Your account has not been verified. Please check your email and verify your account before logging in."
- **Description**: Returned when the user exists but hasn't verified their email

## Email Verification Error Codes

### Invalid Verification Token
- **Error Code**: `INVALID_VERIFICATION_TOKEN`
- **Error Type**: `verification_error`
- **HTTP Status**: 400
- **Message**: "Invalid or expired verification token"
- **Description**: Returned when the verification token is invalid or expired

### User Not Found (Resend Verification)
- **Error Code**: `USER_NOT_FOUND`
- **Error Type**: `not_found_error`
- **HTTP Status**: 404
- **Message**: "User not found"
- **Description**: Returned when trying to resend verification to non-existent user

### Email Already Verified
- **Error Code**: `EMAIL_ALREADY_VERIFIED`
- **Error Type**: `verification_error`
- **HTTP Status**: 400
- **Message**: "Email is already verified"
- **Description**: Returned when trying to resend verification to already verified user

### Email Send Failed
- **Error Code**: `EMAIL_SEND_FAILED`
- **Error Type**: `email_error`
- **HTTP Status**: 500
- **Message**: "Failed to send verification email. Please try again later."
- **Description**: Returned when email service fails to send verification email

## Validation Error Codes

### Email Required
- **Error Code**: `EMAIL_REQUIRED`
- **Error Type**: `validation_error`
- **HTTP Status**: 400
- **Message**: "Email is required"
- **Description**: Returned when email field is missing in request

## Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Human readable error message",
  "errorCode": "SPECIFIC_ERROR_CODE",
  "errorType": "error_category"
}
```

## Validation Error Codes

### Validation Error
- **Error Code**: `VALIDATION_ERROR`
- **Error Type**: `validation_error`
- **HTTP Status**: 400
- **Message**: Various validation error messages
- **Description**: Returned when request validation fails (missing required fields, invalid email format, etc.)

## Frontend Implementation Example

```javascript
// Example of handling login errors
const handleLogin = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      switch (data.errorCode) {
        case 'INVALID_CREDENTIALS':
          // Show "Invalid email or password" message
          break;
        case 'ACCOUNT_NOT_VERIFIED':
          // Show verification required message with resend option
          break;
        default:
          // Show generic error message
      }
    }
  } catch (error) {
    // Handle network errors
  }
};
``` 