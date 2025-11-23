
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { UserProfile } from '@/utils/interviewService';

interface UserProfileFormProps {
  onSubmit: (profile: UserProfile) => void;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [field, setField] = useState('');
  const [medicalSubField, setMedicalSubField] = useState('');
  const [role, setRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate a slight delay to show loading state
    setTimeout(() => {
      const profile: UserProfile = {
        name,
        field: field === 'Medical' ? `${field} - ${medicalSubField}` : field,
        role,
        experienceLevel
      };
      
      onSubmit(profile);
      setIsLoading(false);
    }, 1000);
  };

  const fieldOptions = [
    'Software Engineering',
    'Marketing',
    'Finance',
    'Sales',
    'Human Resources',
    'Design',
    'Product Management',
    'Data Science',
    'Customer Service',
    'Operations',
    'Medical'
  ];

  const experienceLevels = [
    'Beginner (0-1 years)',
    'Intermediate (2-5 years)',
    'Advanced (5+ years)',
    'Senior/Leadership'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Your Name</Label>
        <Input 
          id="name" 
          placeholder="John Doe" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="field">Field</Label>
        <Select 
          value={field} 
          onValueChange={setField}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your field" />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {field === 'Medical' && (
        <div className="space-y-2">
          <Label htmlFor="medical-sub-field">Medical Sub-field</Label>
          <Input 
            id="medical-sub-field" 
            placeholder="e.g. Radiology, Cardiology" 
            value={medicalSubField}
            onChange={(e) => setMedicalSubField(e.target.value)}
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="role">Role You're Applying For</Label>
        <Input 
          id="role" 
          placeholder="e.g. Android Developer, Marketing Manager" 
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience">Experience Level</Label>
        <Select 
          value={experienceLevel} 
          onValueChange={setExperienceLevel}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your experience level" />
          </SelectTrigger>
          <SelectContent>
            {experienceLevels.map(level => (
              <SelectItem key={level} value={level}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-interview-primary hover:bg-interview-secondary"
        disabled={isLoading || !name || !field || !role || !experienceLevel || (field === 'Medical' && !medicalSubField)}
      >
        {isLoading ? "Preparing your interview..." : "Start Interview"}
      </Button>
    </form>
  );
};

export default UserProfileForm;
