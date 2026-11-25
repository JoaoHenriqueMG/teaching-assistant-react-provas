import React, { useEffect, useState } from 'react';
import { Class, CreateClassRequest } from '../types/Class';
import { classService } from '../services/ClassService';

interface ClassFormProps {
  editingClass: Class | null;          // Class being edited, or null to add a new one
  onClassAdded: () => void;            // Callback when a class is successfully added
  onClassUpdated: () => void;          // Callback when a class is successfully updated
  onCancelEdit: () => void;            // Callback when editing is cancelled
  onError: (errorMessage: string) => void;
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

const emptyForm = (): CreateClassRequest => ({ topic: '', semester: 1, year: currentYear });

const formFor = (classObj: Class | null): CreateClassRequest =>
  classObj ? { topic: classObj.topic, semester: classObj.semester, year: classObj.year } : emptyForm();

/** Form to add a class or to edit the identification of an existing one. */
const ClassForm: React.FC<ClassFormProps> = ({ editingClass, onClassAdded, onClassUpdated, onCancelEdit, onError }) => {
  const [formData, setFormData] = useState<CreateClassRequest>(() => formFor(editingClass));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when editingClass changes
  useEffect(() => {
    setFormData(formFor(editingClass));
  }, [editingClass]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'semester' || name === 'year' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.topic.trim()) {
      onError('Topic is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClass) {
        await classService.updateClass(editingClass.id, formData);
        onClassUpdated();
      } else {
        await classService.addClass(formData);
        onClassAdded();
      }
      setFormData(emptyForm());
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="class-form-container">
      <h3>{editingClass ? 'Edit Class' : 'Add New Class'}</h3>
      <form onSubmit={handleSubmit} className="class-form">
        <div className="form-row topic-row">
          <div className="form-group">
            <label htmlFor="topic">Topic:</label>
            <input
              type="text"
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              placeholder="e.g., Software Engineering, Introduction to Programming"
              required
            />
          </div>
        </div>

        <div className="form-row year-semester-row">
          <div className="form-group">
            <label htmlFor="year">Year:</label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              required
            >
              {YEAR_OPTIONS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="semester">Semester:</label>
            <select
              id="semester"
              name="semester"
              value={formData.semester}
              onChange={handleInputChange}
              required
            >
              <option value={1}>1st Semester</option>
              <option value={2}>2nd Semester</option>
            </select>
          </div>
        </div>

        <div className="form-buttons">
          <button type="submit" disabled={isSubmitting} className="submit-btn">
            {isSubmitting ? 'Saving...' : editingClass ? 'Update Class' : 'Add Class'}
          </button>
          {editingClass && (
            <button type="button" onClick={onCancelEdit} className="cancel-btn">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ClassForm;
