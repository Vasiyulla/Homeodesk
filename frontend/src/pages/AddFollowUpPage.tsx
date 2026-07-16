import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore, useFollowUpStore } from '../store/store';
import { followUpApi } from '../services/followUpApi';
import { validateRequiredField } from '../utils/validation';
import Container from '../components/Container';
import Card from '../components/Card';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import TextAreaField from '../components/TextAreaField';
import Button from '../components/Button';
import ErrorAlert from '../components/ErrorAlert';
import SuccessMessage from '../components/SuccessMessage';
import { ArrowLeft, MessageSquare, Clock, RefreshCcw } from 'lucide-react';

const AddFollowUpPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addFollowUp } = useFollowUpStore();

  const [formData, setFormData] = useState({
    days_since_dose: '',
    reaction: '',
    observations: '',
    new_symptoms: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<{ message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [nextAction, setNextAction] = useState<'case' | 'prescribe'>('case');

  if (!isAuthenticated) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!validateRequiredField(formData.days_since_dose)) newErrors.days_since_dose = 'Required';
    if (!validateRequiredField(formData.reaction)) newErrors.reaction = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !caseId) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const result = await followUpApi.createFollowUp(caseId, {
        days_since_dose: parseInt(formData.days_since_dose, 10),
        reaction: formData.reaction,
        observations: formData.observations,
        new_symptoms: formData.new_symptoms ? formData.new_symptoms.split(',').map(s=>({ text: s.trim() })) : []
      });

      if (result.success && result.data) {
        addFollowUp(result.data);
        setSuccessMessage('Follow-up recorded! Redirecting...');
        setTimeout(() => {
          if (nextAction === 'prescribe') {
            navigate(`/cases/${caseId}/add-decision`);
          } else {
            navigate(`/cases/${caseId}`);
          }
        }, 1500);
      } else {
        setApiError(result.error || { message: 'Failed to record follow-up' });
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
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
          <MessageSquare className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Add Follow-up</h1>
          <p className="text-surface-500 mt-1">Record patient reaction and new observations</p>
        </div>
      </div>

      {apiError && <ErrorAlert error={apiError} onClose={() => setApiError(null)} className="mb-6" />}
      {successMessage && <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Timeline & Reaction" icon={<Clock className="w-5 h-5" />}>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Days Since Dose"
              name="days_since_dose"
              type="number"
              value={formData.days_since_dose}
              onChange={handleInputChange}
              placeholder="e.g., 14"
              required
              error={errors.days_since_dose}
              disabled={isLoading}
            />
            <SelectField
              label="Patient Reaction"
              name="reaction"
              value={formData.reaction}
              onChange={handleInputChange}
              options={[
                { value: 'aggravation', label: 'Aggravation' },
                { value: 'improvement', label: 'Improvement' },
                { value: 'stationary', label: 'Stationary / No Change' },
                { value: 'mixed', label: 'Mixed / Alternating' }
              ]}
              required
              error={errors.reaction}
              disabled={isLoading}
            />
          </div>
        </Card>

        <Card title="Observations" icon={<RefreshCcw className="w-5 h-5" />}>
          <TextAreaField
            label="Detailed Observations"
            name="observations"
            value={formData.observations}
            onChange={handleInputChange}
            placeholder="Describe the direction of cure, changes in energy, sleep, etc."
            rows={5}
            disabled={isLoading}
          />
          <InputField
            label="New Symptoms (Optional, comma-separated)"
            name="new_symptoms"
            value={formData.new_symptoms}
            onChange={handleInputChange}
            placeholder="e.g., skin rash, increased thirst"
            disabled={isLoading}
          />
        </Card>

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate(`/cases/${caseId}`)} disabled={isLoading} className="w-32">
            Cancel
          </Button>
          <Button type="submit" loading={isLoading && nextAction === 'case'} onClick={() => setNextAction('case')} className="flex-1 bg-surface-100 text-surface-900 hover:bg-surface-200">
            Save Follow-up
          </Button>
          <Button type="submit" loading={isLoading && nextAction === 'prescribe'} onClick={() => setNextAction('prescribe')} className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-glow">
            Save & Prescribe
          </Button>
        </div>
      </form>
    </Container>
  );
};

export default AddFollowUpPage;
