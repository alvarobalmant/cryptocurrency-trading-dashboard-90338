import React from 'react';
import { useParams } from 'react-router-dom';
import { useNativeClientAuth } from '@/hooks/useNativeClientAuth';

export default function TestBooking() {
  const { barbershopSlug } = useParams();
  const { user, session, isAuthenticated, loading } = useNativeClientAuth('7ce557e7-2850-475d-aa71-77be87c9ec90');

  console.log('🧪 TestBooking:', {
    barbershopSlug,
    user: user?.id,
    session: !!session,
    isAuthenticated,
    loading,
    userEmail: user?.email,
    userPhone: user?.phone
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">Test Booking Auth</h1>
        <div className="space-y-2">
          <p><strong>Barbershop:</strong> {barbershopSlug}</p>
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          <p><strong>User ID:</strong> {user?.id || 'None'}</p>
          <p><strong>Email:</strong> {user?.email || 'None'}</p>
          <p><strong>Phone:</strong> {user?.phone || 'None'}</p>
          <p><strong>Has Session:</strong> {session ? 'Yes' : 'No'}</p>
          <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}