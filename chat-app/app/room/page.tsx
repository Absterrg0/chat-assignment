'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/sonner';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
interface User {
  id: string;
  name: string;
}

export default function CreateRoom() {
  const router = useRouter();
  const [roomInfo, setRoomInfo] = useState({
    name: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const storedUser = localStorage.getItem('chatUser');
    if (!storedUser) {
      router.push('/');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch (err) {
      console.log(err);
      localStorage.removeItem('chatUser');
      router.push('/');
    }
  }, [router]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomInfo.name.trim() || !roomInfo.password.trim()) {
      setError('Room name and password are required');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Call API to create room
      const response = await axios.post<{ status: string, message: string, roomId: string }>('/api/chatRoom', {

        name: roomInfo.name.trim(),
        password: roomInfo.password.trim(),
        createdBy: user?.id,
      });
      toast(`Your room "${roomInfo.name}" has been created successfully.`, {
        duration: 3000,
      });
      
      // Connect to WebSocket server and create the room there as well
      router.push(`/room/${response.data.roomId}`);

    } catch (err) {
      console.log(err);
      setError('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="mr-2 p-0 h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl font-bold">Create New Room</CardTitle>
          </div>
          <CardDescription>Enter room details to create a new chat room</CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Room Name
              </label>
              <Input
                type="text"
                id="name"
                value={roomInfo.name}
                onChange={(e) => setRoomInfo({ ...roomInfo, name: e.target.value })}
                placeholder="Enter room name"
                disabled={isLoading}
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Room Password
              </label>
              <Input
                type="password"
                id="password"
                value={roomInfo.password}
                onChange={(e) => setRoomInfo({ ...roomInfo, password: e.target.value })}
                placeholder="Enter room password"
                disabled={isLoading}
                className="w-full"
                required
              />
              <p className="text-xs text-gray-500">
                This password will be required for others to join your room
              </p>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateRoom}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </Button>
        </CardFooter>
      </Card>
      <Toaster />
    </div>
  );
}