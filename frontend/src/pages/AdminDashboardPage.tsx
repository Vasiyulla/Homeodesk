import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import { Shield, Users, Building, Plus, X, Trash2, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../services/apiClient';
import { patientApi } from '../services/patientApi';
import { Department, EmployeeProfile, Invoice, Patient } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotification } from '../hooks/useNotification';
import LiveIndicator from '../components/LiveIndicator';

interface StaffMember extends EmployeeProfile {}

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { success, info, error: notifyError } = useNotification();
  const [activeTab, setActiveTab] = useState<'staff' | 'departments' | 'billing' | 'settings'>('staff');
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // Forms state
  const [newStaff, setNewStaff] = useState({ email: '', password: '', full_name: '', role: 'DOCTOR', department_id: '' });
  const [newDept, setNewDept] = useState({ name: '', description: '' });
  
  const [newInvoice, setNewInvoice] = useState({ 
    patient_id: '', 
    description: 'Consultation Fee',
    amount: 0 
  });
  const [newOrgName, setNewOrgName] = useState(user?.organization_name || '');
  
  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put('/organization/settings', { name: newOrgName });
      
      const { setUser } = useAuthStore.getState();
      if (user) {
        setUser({ ...user, organization_name: newOrgName });
      }
      
      success('Settings Updated', `Organization renamed to "${newOrgName}"`);
    } catch (err) {
      console.error(err);
      notifyError('Update Failed', 'Failed to update organization settings');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, deptRes, invRes, patRes] = await Promise.all([
        apiClient.get('/staff'),
        apiClient.get('/departments'),
        apiClient.get('/billing/invoices'),
        patientApi.list()
      ]);
      setStaff(staffRes.data);
      setDepartments(deptRes.data);
      setInvoices(invRes.data);
      if (patRes.success && patRes.data) {
        setPatients(patRes.data);
      }
    } catch (error) {
      console.error("Failed to load admin data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Handle Stripe redirect parameters
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      success('Payment Successful', 'The invoice has been paid via Stripe.');
      // Remove query param without refreshing
      navigate('/admin', { replace: true });
      setActiveTab('billing');
    } else if (params.get('payment') === 'cancelled') {
      info('Payment Cancelled', 'The Stripe checkout was cancelled.');
      navigate('/admin', { replace: true });
      setActiveTab('billing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, navigate]);

  const { isConnected } = useWebSocket('billing', (msg) => {
    if (msg.event === 'invoice_created') {
      info('New Invoice', 'A new invoice has been created');
      fetchData();
    } else if (msg.event === 'invoice_paid') {
      success('Invoice Paid', 'An invoice has been marked as paid');
      fetchData();
    }
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...newStaff };
      if (!payload.department_id) {
        payload.department_id = null;
      }
      await apiClient.post('/staff', payload);
      setShowStaffModal(false);
      setNewStaff({ email: '', password: '', full_name: '', role: 'DOCTOR', department_id: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      notifyError('Failed', 'Could not create staff member');
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/departments', newDept);
      setShowDeptModal(false);
      setNewDept({ name: '', description: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      notifyError('Failed', 'Could not create department');
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await apiClient.delete(`/departments/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      notifyError('Failed', 'Could not delete department');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/billing/invoices', {
        patient_id: newInvoice.patient_id,
        items: [{ description: newInvoice.description, amount: Number(newInvoice.amount) }]
      });
      setShowInvoiceModal(false);
      setNewInvoice({ patient_id: '', description: 'Consultation Fee', amount: 0 });
      fetchData();
    } catch (err) {
      console.error(err);
      notifyError('Failed', 'Could not generate invoice');
    }
  };

  const handlePayInvoice = async (id: string) => {
    try {
      const res = await apiClient.post(`/billing/invoices/${id}/checkout`);
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error(err);
      notifyError('Failed', 'Could not initiate Stripe checkout');
    }
  };

  const handlePayCash = async (id: string) => {
    try {
      await apiClient.put(`/billing/invoices/${id}/pay`, { payment_method: 'CASH' });
      info('Success', 'Invoice marked as paid with Cash');
      fetchData();
    } catch (err) {
      console.error(err);
      notifyError('Failed', 'Could not mark invoice as paid');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <Container className="pt-6">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
        
        {/* Header */}
        <motion.div className="bg-gradient-to-r from-brand-600 to-brand-800 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Shield className="w-8 h-8" /> 
                Admin & HR Dashboard
              </h1>
              <p className="text-brand-100 max-w-xl">
                Manage your clinic's working professionals, assign roles, configure departments, and manage billing.
              </p>
            </div>
            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
              <LiveIndicator isConnected={isConnected} />
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex items-center gap-5 border-l-4 border-l-indigo-500 cursor-pointer" onClick={() => setActiveTab('staff')}>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500 uppercase">Total Staff</p>
              <h3 className="text-3xl font-bold text-surface-900">{staff.length}</h3>
            </div>
          </Card>
          <Card className="flex items-center gap-5 border-l-4 border-l-emerald-500 cursor-pointer" onClick={() => setActiveTab('departments')}>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500 uppercase">Departments</p>
              <h3 className="text-3xl font-bold text-surface-900">{departments.length}</h3>
            </div>
          </Card>
          <Card className="flex items-center gap-5 border-l-4 border-l-amber-500 cursor-pointer" onClick={() => setActiveTab('billing')}>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500 uppercase">Pending Invoices</p>
              <h3 className="text-3xl font-bold text-surface-900">{invoices.filter(i => i.status === 'PENDING').length}</h3>
            </div>
          </Card>
        </motion.div>

        {/* Tabs */}
        <div className="flex border-b border-surface-200 gap-6">
          <button 
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'staff' ? 'text-brand-600 border-brand-600' : 'text-surface-400 border-transparent hover:text-surface-600'}`}
            onClick={() => setActiveTab('staff')}
          >
            Staff Directory
          </button>
          <button 
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'departments' ? 'text-brand-600 border-brand-600' : 'text-surface-400 border-transparent hover:text-surface-600'}`}
            onClick={() => setActiveTab('departments')}
          >
            Departments
          </button>
          <button 
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'billing' ? 'text-brand-600 border-brand-600' : 'text-surface-400 border-transparent hover:text-surface-600'}`}
            onClick={() => setActiveTab('billing')}
          >
            Billing & Invoices
          </button>
          <button 
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'settings' ? 'text-brand-600 border-brand-600' : 'text-surface-400 border-transparent hover:text-surface-600'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Tab Content: Staff */}
        {activeTab === 'staff' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-surface-900">Working Professionals</h2>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowStaffModal(true)}>Onboard Staff</Button>
            </div>
            <Card className="overflow-hidden p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-100">
                    <th className="p-4 font-semibold text-surface-600">Name</th>
                    <th className="p-4 font-semibold text-surface-600">Role</th>
                    <th className="p-4 font-semibold text-surface-600">Email</th>
                    <th className="p-4 font-semibold text-surface-600">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-surface-500">Loading staff directory...</td></tr>
                  ) : staff.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-surface-500">No staff found.</td></tr>
                  ) : (
                    staff.map((member) => (
                      <tr key={member.user_id} className="border-b border-surface-100 hover:bg-surface-50">
                        <td className="p-4 font-medium text-surface-900">{member.full_name || 'Unnamed'}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            member.role === 'ADMIN' || member.role === 'OWNER' ? 'bg-indigo-100 text-indigo-700' :
                            member.role === 'DOCTOR' ? 'bg-brand-100 text-brand-700' :
                            member.role === 'NURSE' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="p-4 text-surface-600">{member.email}</td>
                        <td className="p-4 text-surface-600">{member.department || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </motion.div>
        )}

        {/* Tab Content: Departments */}
        {activeTab === 'departments' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-surface-900">Organization Departments</h2>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowDeptModal(true)}>Add Department</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                <div className="col-span-full p-8 text-center text-surface-500">Loading departments...</div>
              ) : departments.length === 0 ? (
                <div className="col-span-full p-8 text-center text-surface-500 bg-surface-50 rounded-2xl border border-dashed">No departments configured.</div>
              ) : (
                departments.map(dept => (
                  <Card key={dept.id} className="flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-surface-900">{dept.name}</h3>
                      <button onClick={() => handleDeleteDept(dept.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-surface-500 text-sm mb-4 flex-1">{dept.description || 'No description provided.'}</p>
                  </Card>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Tab Content: Billing */}
        {activeTab === 'billing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-surface-900">Invoices & Billing</h2>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowInvoiceModal(true)}>Generate Invoice</Button>
            </div>
            <Card className="overflow-hidden p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-100">
                    <th className="p-4 font-semibold text-surface-600">Patient ID</th>
                    <th className="p-4 font-semibold text-surface-600">Amount</th>
                    <th className="p-4 font-semibold text-surface-600">Date</th>
                    <th className="p-4 font-semibold text-surface-600">Status</th>
                    <th className="p-4 font-semibold text-surface-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-surface-500">Loading invoices...</td></tr>
                  ) : invoices.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-surface-500">No invoices generated yet.</td></tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-surface-100 hover:bg-surface-50">
                        <td className="p-4 font-medium text-surface-900">{invoice.patient_id.substring(0,8)}...</td>
                        <td className="p-4 font-bold text-surface-900">${invoice.amount_due.toFixed(2)}</td>
                        <td className="p-4 text-surface-600">{new Date(invoice.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {invoice.status} {invoice.payment_method ? `(${invoice.payment_method})` : ''}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {invoice.status === 'PENDING' && (
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" size="sm" onClick={() => handlePayCash(invoice.id)}>Cash</Button>
                              <Button variant="primary" size="sm" onClick={() => handlePayInvoice(invoice.id)}>Online</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </motion.div>
        )}

        {/* Tab Content: Settings */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-surface-900">Organization Settings</h2>
            </div>
            <Card className="max-w-2xl">
              <form onSubmit={handleUpdateOrganization} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-surface-900 mb-2">White-Label Branding</h3>
                  <p className="text-surface-500 text-sm mb-4">
                    Set the name of your organization. This will update the branding across the entire software suite for all your staff.
                  </p>
                  <InputField 
                    label="Hospital / Clinic Name" 
                    name="orgName" 
                    required 
                    value={newOrgName} 
                    onChange={e => setNewOrgName(e.target.value)} 
                    placeholder="e.g. Apex Health Hospital"
                  />
                </div>
                
                <div className="pt-4 border-t border-surface-200">
                  <Button type="submit" className="shadow-glow">Save Settings</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

      </motion.div>

      {/* Staff Modal */}
      <AnimatePresence>
        {showStaffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-surface-200"
            >
              <div className="p-6 border-b border-surface-100 flex justify-between items-center bg-surface-50">
                <h3 className="font-bold text-lg text-surface-900">Provision Staff Account</h3>
                <button onClick={() => setShowStaffModal(false)} className="text-surface-400 hover:text-surface-600"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
                <InputField label="Full Name" name="full_name" required value={newStaff.full_name} onChange={e => setNewStaff({...newStaff, full_name: e.target.value})} />
                <InputField label="Email Address" type="email" name="email" required value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                <InputField label="Temporary Password" type="password" name="password" required value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
                
                <SelectField 
                  label="Role" 
                  name="role" 
                  required 
                  options={[
                    { value: 'DOCTOR', label: 'Doctor' },
                    { value: 'NURSE', label: 'Nurse' },
                    { value: 'ASSISTANT', label: 'Assistant' },
                    { value: 'ADMIN', label: 'Admin' }
                  ]}
                  value={newStaff.role} 
                  onChange={e => setNewStaff({...newStaff, role: e.target.value})} 
                />
                
                <SelectField 
                  label="Department (Optional)" 
                  name="department_id"
                  options={[
                    { value: '', label: 'None' },
                    ...departments.map(d => ({ value: d.id, label: d.name }))
                  ]}
                  value={newStaff.department_id} 
                  onChange={e => setNewStaff({...newStaff, department_id: e.target.value})} 
                />

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowStaffModal(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1">Create Account</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dept Modal */}
      <AnimatePresence>
        {showDeptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-surface-200"
            >
              <div className="p-6 border-b border-surface-100 flex justify-between items-center bg-surface-50">
                <h3 className="font-bold text-lg text-surface-900">Add Department</h3>
                <button onClick={() => setShowDeptModal(false)} className="text-surface-400 hover:text-surface-600"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleCreateDept} className="p-6 space-y-4">
                <InputField label="Department Name" name="name" required value={newDept.name} onChange={e => setNewDept({...newDept, name: e.target.value})} />
                <InputField label="Description (Optional)" name="description" value={newDept.description} onChange={e => setNewDept({...newDept, description: e.target.value})} />
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowDeptModal(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1">Save Department</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Modal */}
      <AnimatePresence>
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-surface-200"
            >
              <div className="p-6 border-b border-surface-100 flex justify-between items-center bg-surface-50">
                <h3 className="font-bold text-lg text-surface-900 flex items-center gap-2"><Receipt className="w-5 h-5"/> Generate Invoice</h3>
                <button onClick={() => setShowInvoiceModal(false)} className="text-surface-400 hover:text-surface-600"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
                <SelectField
                  label="Patient"
                  name="patient_id"
                  required
                  options={[
                    { value: '', label: 'Select a patient...' },
                    ...patients.map(p => ({ value: p.id, label: `${p.name} (${p.id.substring(0, 8)})` }))
                  ]}
                  value={newInvoice.patient_id}
                  onChange={e => setNewInvoice({...newInvoice, patient_id: e.target.value})}
                />
                <InputField label="Item Description" name="description" required value={newInvoice.description} onChange={e => setNewInvoice({...newInvoice, description: e.target.value})} />
                <InputField label="Amount ($)" type="number" name="amount" required value={newInvoice.amount.toString()} onChange={e => setNewInvoice({...newInvoice, amount: Number(e.target.value)})} />
                
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowInvoiceModal(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1 shadow-glow">Create Invoice</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </Container>
  );
};

export default AdminDashboardPage;
