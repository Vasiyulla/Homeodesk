import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore, useDecisionStore } from '../store/store';
import { decisionApi } from '../services/decisionApi';
import { validateRequiredField } from '../utils/validation';
import Container from '../components/Container';
import Card from '../components/Card';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import TextAreaField from '../components/TextAreaField';
import Button from '../components/Button';
import ErrorAlert from '../components/ErrorAlert';
import SuccessMessage from '../components/SuccessMessage';
import { ArrowLeft, Pill, ShieldAlert, Activity } from 'lucide-react';

const AddDecisionPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addDecision } = useDecisionStore();

  const [formData, setFormData] = useState({
    remedy_name: '',
    potency: '',
    dose: '',
    reasoning: '',
    confidence: 'medium'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<{ message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isAuthenticated) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!validateRequiredField(formData.remedy_name)) newErrors.remedy_name = 'Required';
    if (!validateRequiredField(formData.potency)) newErrors.potency = 'Required';
    if (!validateRequiredField(formData.dose)) newErrors.dose = 'Required';
    if (!validateRequiredField(formData.reasoning)) newErrors.reasoning = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !caseId) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const result = await decisionApi.createDecision(caseId, formData);
      if (result.success && result.data) {
        addDecision(result.data);
        setSuccessMessage('Prescription recorded! Redirecting...');
        setTimeout(() => navigate(`/cases/${caseId}`), 1500);
      } else {
        setApiError(result.error || { message: 'Failed to record decision' });
      }
    } catch (err) {
      setApiError({ message: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <Container narrow>
      <button onClick={() => navigate(`/cases/${caseId}`)} className="flex items-center text-sm font-medium text-surface-500 hover:text-surface-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Case
      </button>

      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center border border-brand-100">
          <Pill className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Record Prescription</h1>
          <p className="text-surface-500 mt-1">Log a new remedy decision for this case</p>
        </div>
      </div>

      {apiError && <ErrorAlert error={apiError} onClose={() => setApiError(null)} className="mb-6" />}
      {successMessage && <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Prescription Details" icon={<Pill className="w-5 h-5" />}>
          <InputField
            label="Remedy Name"
            name="remedy_name"
            value={formData.remedy_name}
            onChange={handleInputChange}
            placeholder="e.g., Lycopodium clavatum"
            required
            error={errors.remedy_name}
            disabled={isLoading}
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Potency"
              name="potency"
              value={formData.potency}
              onChange={handleInputChange}
              placeholder="e.g., 200CH"
              required
              error={errors.potency}
              disabled={isLoading}
            />
            <InputField
              label="Dosage Instructions"
              name="dose"
              value={formData.dose}
              onChange={handleInputChange}
              placeholder="e.g., 2 pellets, one dose"
              required
              error={errors.dose}
              disabled={isLoading}
            />
          </div>
        </Card>

        <Card title="Clinical Justification" icon={<Activity className="w-5 h-5" />}>
          <SelectField
            label="Confidence Level"
            name="confidence"
            value={formData.confidence}
            onChange={handleInputChange}
            options={[
              { value: 'high', label: 'High Confidence' },
              { value: 'medium', label: 'Medium Confidence' },
              { value: 'low', label: 'Low Confidence' }
            ]}
            disabled={isLoading}
          />
          <TextAreaField
            label="Reasoning / Selected Rubrics"
            name="reasoning"
            value={formData.reasoning}
            onChange={handleInputChange}
            placeholder="Why was this remedy chosen? Which rubrics strongly pointed to it?"
            rows={5}
            required
            error={errors.reasoning}
            disabled={isLoading}
          />
        </Card>

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate(`/cases/${caseId}`)} disabled={isLoading} className="w-32">
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} className="flex-1 shadow-glow" icon={<ShieldAlert className="w-4 h-4" />}>
            Confirm Prescription
          </Button>
        </div>
      </form>
    </Container>
  );
};

export default AddDecisionPage;
