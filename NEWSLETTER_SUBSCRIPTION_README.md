# Newsletter Subscription Feature

## Overview
This feature allows users to subscribe to the newsletter from the homepage Section 6 "Kabar Spesial!". When users submit their email, it will be saved to the database and they will see a success popup.

## Database Schema
The newsletter subscriptions are stored in the `newsletter_subscriptions` table with the following structure:

```sql
CREATE TABLE newsletter_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoint
- **URL**: `/api/newsletter`
- **Method**: `POST`
- **Request Body**: 
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Responses**:
  - `200 OK`: Email successfully saved
    ```json
    {
      "success": true,
      "message": "Email berhasil disimpan",
      "data": { "id": "...", "email": "...", "created_at": "...", "updated_at": "..." }
    }
    ```
  - `400 Bad Request`: Invalid email format
    ```json
    {
      "error": "Email tidak valid"
    }
    ```
  - `409 Conflict`: Email already exists
    ```json
    {
      "error": "Email sudah terdaftar"
    }
    ```
  - `500 Internal Server Error`: Server error
    ```json
    {
      "error": "Gagal menyimpan email" || "Terjadi kesalahan server"
    }
    ```

## Frontend Implementation
The newsletter subscription form is implemented in `src/app/page.tsx` with the following features:

1. **Form Validation**: Validates email format before submission
2. **Loading State**: Shows "Mengirim..." while submitting
3. **Success Popup**: Displays a smooth popup with success message
4. **Error Handling**: Shows error notifications for various failure scenarios

### Components
- **Form**: Located in Section 6 "Kabar Spesial!"
- **Success Popup**: Modal with fade-in and scale animations
- **Error Notifications**: Reuses existing notification system

### State Management
- `email`: Stores the current email input value
- `isSubmitting`: Tracks submission state
- `showSuccessPopup`: Controls popup visibility

## CSS Animations
The popup uses smooth animations defined in `src/app/globals.css`:

- `fade-in`: Background overlay fade-in effect
- `scale-in`: Popup scale and fade-in effect

## Security Features
- Row Level Security (RLS) enabled on the database table
- Email validation on both client and server side
- SQL injection prevention through parameterized queries

## Setup Instructions
1. Run the SQL script `create_newsletter_subscriptions_table.sql` to create the database table
2. The API endpoint is automatically available at `/api/newsletter`
3. The form is already integrated into the homepage

## Future Enhancements
- Email verification process
- Unsubscribe functionality
- Email template customization
- Analytics tracking for subscription rates