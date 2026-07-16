import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { authApi } from '../services/authApi';
import { validateEmail, validatePassword } from '../utils/validation';
import Button from '../components/Button';
import InputField from '../components/InputField';
import ErrorAlert from '../components/ErrorAlert';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Mail, Lock, User as UserIcon, Award, Building, Users, Briefcase, ArrowRight, ArrowLeft } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, setUser } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [registerStep, setRegisterStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    license_number: '',
    clinic_name: '',
    clinic_type: '',
    employee_count: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<{ message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (isLogin) {
      if (!validateEmail(formData.email)) newErrors.email = 'Please enter a valid email';
      if (!validatePassword(formData.password)) newErrors.password = 'Password is required';
    } else {
      if (registerStep === 1) {
        if (!validateEmail(formData.email)) newErrors.email = 'Please enter a valid email';
        if (!validatePassword(formData.password)) newErrors.password = 'Password must be at least 6 characters';
        if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
        if (!formData.license_number.trim()) newErrors.license_number = 'License number is required';
      } else if (registerStep === 2) {
        if (!formData.clinic_name.trim()) newErrors.clinic_name = 'Clinic name is required';
        if (!formData.clinic_type) newErrors.clinic_type = 'Please select a clinic type';
        if (!formData.employee_count) newErrors.employee_count = 'Please select employee count';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isLogin && registerStep === 1) {
      setRegisterStep(2);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      if (isLogin) {
        const result = await authApi.login(formData.email, formData.password);
        if (result.success) {
          const profileResult = await authApi.getProfile();
          if (profileResult.success && profileResult.data) {
            setUser(profileResult.data);
            navigate('/');
          } else {
            setApiError(profileResult.error || { message: 'Failed to fetch user profile' });
          }
        } else {
          setApiError(result.error || { message: 'Login failed' });
        }
      } else {
        const result = await authApi.register({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          license_number: formData.license_number,
          clinic_name: formData.clinic_name,
          clinic_type: formData.clinic_type,
          employee_count: formData.employee_count,
        });

        if (result.success) {
          // Auto login after registration
          const loginResult = await authApi.login(formData.email, formData.password);
          if (loginResult.success) {
            const profileResult = await authApi.getProfile();
            if (profileResult.success && profileResult.data) {
              setUser(profileResult.data);
              navigate('/');
            }
          }
        } else {
          setApiError(result.error || { message: 'Registration failed' });
        }
      }
    } catch (err) {
      setApiError({ message: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-5xl h-[700px] flex rounded-3xl overflow-hidden shadow-glass-lg bg-white relative">
        
        {/* Left Side — Branding (Hidden on mobile) */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-600 to-brand-900 p-12 flex-col justify-between relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 mb-8">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              Next-Generation<br />Homeopathic<br />Case Management
            </h1>
            <p className="text-brand-100 text-lg max-w-sm">
              Secure, intelligent, and designed exclusively for professional practitioners.
            </p>
          </div>

          <div className="relative z-10 glass-blur bg-white/10 border border-white/20 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-brand-200 border-2 border-brand-800 flex items-center justify-center text-brand-700 font-bold text-xs">
                    Dr. {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-brand-50 text-sm font-medium">Join 2,000+ Practitioners</p>
            </div>
            <p className="text-brand-100 text-sm italic">
              "The most intuitive clinical workspace I've used in my 15 years of practice."
            </p>
          </div>
        </div>

        {/* Right Side — Auth Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative bg-white">
          <div className="max-w-md w-full mx-auto">
            
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-sm">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-surface-900 leading-tight">Homeopathy</h1>
                <p className="text-sm font-medium text-brand-600">Case Manager</p>
              </div>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-surface-900 mb-3">
                {isLogin ? 'Staff & Admin Portal' : 'Register your Clinic'}
              </h2>
              <p className="text-surface-500">
                {isLogin 
                  ? 'Enter your credentials to access your hospital workspace.' 
                  : 'Join the next generation of homeopathy practice.'}
              </p>
            </div>

            {/* Custom Tabs */}
            <div className="flex p-1 bg-surface-100 rounded-xl mb-8">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  isLogin ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
                }`}
                onClick={() => setIsLogin(true)}
              >
                Log In
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  !isLogin ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
                }`}
                onClick={() => setIsLogin(false)}
              >
                Register Clinic
              </button>
            </div>

            {apiError && (
              <ErrorAlert error={apiError} onClose={() => setApiError(null)} />
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="popLayout" initial={false}>
                {(!isLogin && registerStep === 2) ? (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <InputField
                      label="Clinic / Hospital Name"
                      name="clinic_name"
                      placeholder="e.g. Apex Hospital"
                      value={formData.clinic_name}
                      onChange={handleInputChange}
                      error={errors.clinic_name}
                      disabled={isLoading}
                      icon={<Building className="w-5 h-5" />}
                    />
                    
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-surface-900">Clinic Type</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <select
                          name="clinic_type"
                          value={formData.clinic_type}
                          onChange={(e: any) => handleInputChange(e)}
                          disabled={isLoading}
                          className={`w-full pl-10 pr-4 py-2.5 bg-surface-50 border rounded-xl text-sm transition-all focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none ${
                            errors.clinic_type ? 'border-red-300' : 'border-surface-200'
                          } ${!formData.clinic_type ? 'text-surface-400' : 'text-surface-900'}`}
                        >
                          <option value="" disabled>Select clinic type...</option>
                          <option value="Single-person Clinic">Single-person Clinic</option>
                          <option value="Polyclinic">Polyclinic</option>
                          <option value="Hospital">Hospital</option>
                          <option value="Academic Institution">Academic Institution</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {errors.clinic_type && <p className="text-xs text-red-500 mt-1">{errors.clinic_type}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-surface-900">Number of Employees</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                          <Users className="w-5 h-5" />
                        </div>
                        <select
                          name="employee_count"
                          value={formData.employee_count}
                          onChange={(e: any) => handleInputChange(e)}
                          disabled={isLoading}
                          className={`w-full pl-10 pr-4 py-2.5 bg-surface-50 border rounded-xl text-sm transition-all focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none ${
                            errors.employee_count ? 'border-red-300' : 'border-surface-200'
                          } ${!formData.employee_count ? 'text-surface-400' : 'text-surface-900'}`}
                        >
                          <option value="" disabled>Select employee count...</option>
                          <option value="1 (Just me)">1 (Just me)</option>
                          <option value="2-5">2 - 5 employees</option>
                          <option value="6-15">6 - 15 employees</option>
                          <option value="16-50">16 - 50 employees</option>
                          <option value="50+">50+ employees</option>
                        </select>
                      </div>
                      {errors.employee_count && <p className="text-xs text-red-500 mt-1">{errors.employee_count}</p>}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    {!isLogin && (
                      <>
                        <InputField
                          label="Your Name (Owner)"
                          name="full_name"
                          placeholder="Dr. Jane Doe"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          error={errors.full_name}
                          disabled={isLoading}
                          icon={<UserIcon className="w-5 h-5" />}
                        />
                        <InputField
                          label="Medical License Number"
                          name="license_number"
                          placeholder="Med-12345"
                          value={formData.license_number}
                          onChange={handleInputChange}
                          error={errors.license_number}
                          disabled={isLoading}
                          icon={<Award className="w-5 h-5" />}
                        />
                      </>
                    )}

                    <InputField
                      label="Email Address"
                      name="email"
                      type="email"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      error={errors.email}
                      disabled={isLoading}
                      icon={<Mail className="w-5 h-5" />}
                    />

                    <InputField
                      label="Password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      error={errors.password}
                      disabled={isLoading}
                      icon={<Lock className="w-5 h-5" />}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {isLogin && (
                <div className="flex justify-end mt-1">
                  <a href="#" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                    Forgot password?
                  </a>
                </div>
              )}

              <div className="flex items-center gap-3 mt-8">
                {!isLogin && registerStep === 2 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setRegisterStep(1)}
                    disabled={isLoading}
                    className="shrink-0"
                    icon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={isLoading}
                  className="shadow-glow"
                  icon={!isLogin && registerStep === 1 ? <ArrowRight className="w-4 h-4" /> : undefined}
                >
                  {isLogin 
                    ? 'Sign In to Workspace' 
                    : (registerStep === 1 ? 'Continue' : 'Create Clinic Account')}
                </Button>
              </div>
            </form>

            <p className="mt-8 text-center text-xs text-surface-400">
              By continuing, you agree to our Terms of Service and Privacy Policy. Secure access via JWT.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
