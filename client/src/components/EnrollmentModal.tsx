import React, { useState } from 'react';
import { Class } from '../types/Class';
import { Student } from '../types/Student';
import { enrollmentService } from '../services/EnrollmentService';

interface EnrollmentModalProps {
  classObj: Class;                 // Class to enroll students in
  allStudents: Student[];          // Every registered student
  onClose: () => void;             // Callback when the modal is dismissed
  onStudentsEnrolled: () => void;  // Callback when the selected students were enrolled
  onError: (errorMessage: string) => void;
}

/** Students not enrolled in the given class. */
const availableStudentsFor = (classObj: Class, allStudents: Student[]): Student[] => {
  const enrolledStudentCPFs = new Set(classObj.enrollments.map(enrollment => enrollment.student.cpf));
  return allStudents.filter(student => !enrolledStudentCPFs.has(student.cpf));
};

/** Modal to select registered students and enroll them in a class. */
const EnrollmentModal: React.FC<EnrollmentModalProps> = ({ classObj, allStudents, onClose, onStudentsEnrolled, onError }) => {
  const [selectedCPFs, setSelectedCPFs] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState(false);

  const availableStudents = availableStudentsFor(classObj, allStudents);

  const handleStudentToggle = (studentCPF: string) => {
    const newSelection = new Set(selectedCPFs);
    if (newSelection.has(studentCPF)) {
      newSelection.delete(studentCPF);
    } else {
      newSelection.add(studentCPF);
    }
    setSelectedCPFs(newSelection);
  };

  const handleSelectAll = () => setSelectedCPFs(new Set(availableStudents.map(s => s.cpf)));
  const handleSelectNone = () => setSelectedCPFs(new Set());

  const handleEnrollSelected = async () => {
    if (selectedCPFs.size === 0) {
      onError('Please select students to enroll');
      return;
    }

    setIsEnrolling(true);
    try {
      await Promise.all(
        Array.from(selectedCPFs).map(studentCPF => enrollmentService.enrollStudent(classObj.id, studentCPF))
      );
      setSelectedCPFs(new Set());
      onStudentsEnrolled();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="enrollment-overlay">
      <div className="enrollment-modal">
        <div className="enrollment-modal-header">
          <h3>Enroll Students in {classObj.topic}</h3>
          <button
            className="close-modal-btn"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="enrollment-modal-content">
          {/* Currently Enrolled Students */}
          <div className="current-enrollments">
            <h4>Currently Enrolled ({classObj.enrollments.length}):</h4>
            {classObj.enrollments.length === 0 ? (
              <p className="no-enrollments">No students enrolled yet</p>
            ) : (
              <div className="enrolled-students-list">
                {classObj.enrollments.map(enrollment => (
                  <span key={enrollment.student.cpf} className="enrolled-badge">
                    {enrollment.student.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Available Students to Enroll */}
          <div className="available-students">
            <div className="available-students-header">
              <h4>Available Students ({availableStudents.length}):</h4>
              <div className="selection-controls">
                <button
                  type="button"
                  className="select-all-btn"
                  onClick={handleSelectAll}
                  disabled={availableStudents.length === 0}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="select-none-btn"
                  onClick={handleSelectNone}
                >
                  Select None
                </button>
              </div>
            </div>

            {availableStudents.length === 0 ? (
              <p className="no-available-students">All registered students are already enrolled in this class</p>
            ) : (
              <div className="students-grid">
                {availableStudents.map(student => (
                  <div
                    key={student.cpf}
                    className={`student-card ${selectedCPFs.has(student.cpf) ? 'selected' : ''}`}
                    onClick={() => handleStudentToggle(student.cpf)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCPFs.has(student.cpf)}
                      onChange={() => handleStudentToggle(student.cpf)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="student-info">
                      <div className="student-name">{student.name}</div>
                      <div className="student-cpf">{student.cpf}</div>
                      <div className="student-email">{student.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="enrollment-actions">
            <button
              className="cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="enroll-selected-btn"
              onClick={handleEnrollSelected}
              disabled={isEnrolling || selectedCPFs.size === 0}
            >
              {isEnrolling
                ? 'Enrolling...'
                : `Enroll ${selectedCPFs.size} Student${selectedCPFs.size !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentModal;
