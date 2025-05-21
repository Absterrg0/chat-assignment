'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Room {
  id: string;
  name: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
}

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState('');
  const [isUserInfoSet, setIsUserInfoSet] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  useEffect(() => {
    // Check if user info is already in localStorage
    const storedUser = localStorage.getItem('chatUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsUserInfoSet(true);
      } catch (err) {
        console.log(err);
        localStorage.removeItem('chatUser');
      }
    }
  }, []);

  useEffect(() => {
    if (isUserInfoSet) {
      fetchRooms();
    }
  }, [isUserInfoSet]);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/chatRoom/all');
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      } else {
        setError('Failed to fetch rooms');
      }
    } catch (err) {
      console.log(err);
      setError('Failed to fetch rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Call the API to sign in or sign up
      const response = await axios.post('/api/user', {
        name: userName.trim(),
      });
      
      const { status, message, user } = response.data as { status: string, message: string, user: User };
      
      if (status === 'success' && user) {
        // Save user info to localStorage
        localStorage.setItem('chatUser', JSON.stringify(user));
        setUser(user);
        setIsUserInfoSet(true);
        
        // Show toast based on whether user signed in or signed up
        toast(message === 'User has signed in' ? 'Welcome back!' : 'Account created', {
          duration: 3000,
        });
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.log(err);
      setError('Failed to authenticate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    // Instead of directly navigating, open the password modal
    setSelectedRoomId(roomId);
    setPassword('');
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setPasswordError('Please enter the room password');
      return;
    }
    
    try {
      setIsVerifyingPassword(true);
      setPasswordError('');
      
      // Call API to verify the room password
      const response = await axios.post('/api/chatRoom/verify-password', {
        roomId: selectedRoomId,
        password: password.trim(),
      });
      
      const { status, message } = response.data as { status: string, message: string };
      
      if (status === 'success') {
        // Close modal and navigate to the room
        setIsPasswordModalOpen(false);
        router.push(`/room/${selectedRoomId}`);
      } else {
        setPasswordError(message || 'Invalid password. Please try again.');
      }
    } catch (err) {
      console.log(err);
      setPasswordError('Failed to verify password. Please try again.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleCreateRoom = () => {
    router.push('/room');
  };

  const handleLogout = () => {
    localStorage.removeItem('chatUser');
    setUser(null);
    setIsUserInfoSet(false);
    setUserName('');
  };

  if (!isUserInfoSet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Welcome to Chat App</CardTitle>
            <CardDescription className="text-center">Sign in or create an account to continue</CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleUserInfoSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Your Name
                </label>
                <Input
                  type="text"
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={isLoading}
                  className="w-full"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chat Rooms</h1>
            {user && (
              <p className="text-gray-500 mt-1">
                Signed in as <span className="font-medium">{user.name}</span>
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={handleLogout}
            >
              Sign Out
            </Button>
            <Button onClick={handleCreateRoom}>
              Create Room
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading rooms...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card key={room.id} className="hover:shadow-md transition-shadow duration-200">
                <CardHeader>
                  <CardTitle>{room.name}</CardTitle>
                  <CardDescription>
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Badge variant="outline">Room</Badge>
                    <Badge variant="secondary">{room.id}</Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleJoinRoom(room.id)}
                  >
                    Join Room
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && rooms.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Rooms Available</h3>
            <p className="text-gray-500 mb-6">Create a new room to get started</p>
            <Button onClick={handleCreateRoom}>
              Create Your First Room
            </Button>
          </div>
        )}
      </div>

      {/* Password Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Room Password Required</DialogTitle>
            <DialogDescription>
              Please enter the password to join this chat room.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4 py-4">
            {passwordError && (
              <Alert variant="destructive">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password"
                disabled={isVerifyingPassword}
                className="w-full"
                required
              />
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
                disabled={isVerifyingPassword}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isVerifyingPassword}
              >
                {isVerifyingPassword ? 'Verifying...' : 'Join Room'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  );
}