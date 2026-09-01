import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/marketplace';
import { auth } from '../firebase';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signOutUser } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  business: any | null;
  driver: any | null;
  admin: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: 'customer' | 'business' | 'driver' | 'admin') => Promise<void>;
  signup: (email: string, password: string, role: 'customer' | 'business' | 'driver' | 'admin') => Promise<void>;
  loginWithGoogle: (role: 'customer' | 'business' | 'driver' | 'admin') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const createUserData = (firebaseUser: any, role: 'customer' | 'business' | 'driver' | 'admin', email: string): any => {
  const baseUserData = {
    firebaseUid: firebaseUser.uid,
    email: email,
    role: role,
    createdAt: new Date().toISOString()
  };

  if (role === 'customer') {
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Customer User',
      ...baseUserData,
      phone: firebaseUser.phoneNumber || '',
      location: 'Ghana',
    };
  } else if (role === 'business') {
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Business Name',
      ...baseUserData,
      phone: firebaseUser.phoneNumber || '',
      category: 'General',
      status: 'pending',
      rating: 0,
      reviewCount: 0,
      followerCount: 0,
      productCount: 0,
      city: '',
      region: '',
      description: '',
      pickupLocation: '',
      digitalAddress: '',
      deliveryOptions: [],
      openingHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '10:00', close: '16:00' },
        sunday: { open: '00:00', close: '00:00', closed: true },
      }
    };
  } else if (role === 'driver') {
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Driver Name',
      ...baseUserData,
      phone: firebaseUser.phoneNumber || '',
      vehicleType: '',
      vehicleNumber: '',
      rating: 0,
      completedDeliveries: 0,
      earnings: 0,
      status: 'inactive'
    };
  } else if (role === 'admin') {
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Admin User',
      ...baseUserData,
      permissions: ['all']
    };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<any | null>(null);
  const [driver, setDriver] = useState<any | null>(null);
  const [admin, setAdmin] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, check localStorage for role and user data
        const storedUser = localStorage.getItem('user');
        const storedRole = localStorage.getItem('userRole');
        
        if (storedUser && storedRole) {
          const parsedUser = JSON.parse(storedUser);
          
          if (storedRole === 'customer') {
            setUser(parsedUser);
          } else if (storedRole === 'business') {
            setBusiness(parsedUser);
          } else if (storedRole === 'driver') {
            setDriver(parsedUser);
          } else if (storedRole === 'admin') {
            setAdmin(parsedUser);
          }
        }
      } else {
        // User is signed out
        setUser(null);
        setBusiness(null);
        setDriver(null);
        setAdmin(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, role: 'customer' | 'business' | 'driver' | 'admin') => {
    try {
      const firebaseUser = await signInWithEmail(email, password);
      const userData = createUserData(firebaseUser, role, email);
      
      if (role === 'customer') {
        setUser(userData);
      } else if (role === 'business') {
        setBusiness(userData);
      } else if (role === 'driver') {
        setDriver(userData);
      } else if (role === 'admin') {
        setAdmin(userData);
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userRole', role);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, role: 'customer' | 'business' | 'driver' | 'admin') => {
    try {
      const firebaseUser = await signUpWithEmail(email, password);
      const userData = createUserData(firebaseUser, role, email);
      
      if (role === 'customer') {
        setUser(userData);
      } else if (role === 'business') {
        setBusiness(userData);
      } else if (role === 'driver') {
        setDriver(userData);
      } else if (role === 'admin') {
        setAdmin(userData);
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userRole', role);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async (role: 'customer' | 'business' | 'driver' | 'admin') => {
    try {
      const firebaseUser = await signInWithGoogle();
      const userData = createUserData(firebaseUser, role, firebaseUser.email || '');
      
      if (role === 'customer') {
        setUser(userData);
      } else if (role === 'business') {
        setBusiness(userData);
      } else if (role === 'driver') {
        setDriver(userData);
      } else if (role === 'admin') {
        setAdmin(userData);
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userRole', role);
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      setUser(null);
      setBusiness(null);
      setDriver(null);
      setAdmin(null);
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const isAuthenticated = !!user || !!business || !!driver || !!admin;

  return (
    <AuthContext.Provider value={{ user, business, driver, admin, isAuthenticated, isLoading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
