import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import Layout from '../components/Layout';

const UserManagementScreen = () => {
  const { fetchAllUsers } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUsers = async () => {
      setLoading(true);
      const { data, error: fetchError } = await fetchAllUsers();
      if (fetchError) {
        setError('Failed to fetch users. This might be due to Row Level Security policies on the "profiles" table. Please ensure that a policy exists to allow read access.');
        console.error(fetchError);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };

    getUsers();
  }, [fetchAllUsers]);

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>
        {loading && <p>Loading users...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && users.length === 0 && <p>No users found.</p>}
        {!loading && !error && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Email</th>
                  <th className="py-2 px-4 border-b">Full Name</th>
                  <th className="py-2 px-4 border-b">User Type</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-2 px-4 border-b">{user.email}</td>
                    <td className="py-2 px-4 border-b">{user.full_name || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{user.user_type || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserManagementScreen;
