import React, { useState, useEffect, useCallback } from 'react';
import { Class } from '../types/Class';
import { GRADES } from '../types/Evaluation';
import { RankedStudent } from '../types/AutoGrading';
import { classService } from '../services/ClassService';
import { enrollmentService } from '../services/EnrollmentService';
import NumericGradeInput from './NumericGradeInput';
import AutoGrading from './AutoGrading';
import SheetIcon from './SheetIcon';

import { ImportGradeComponent } from './ImportGrade';

interface EvaluationsProps {
  onError: (errorMessage: string) => void;
}

const Evaluations: React.FC<EvaluationsProps> = ({ onError }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    // Load previously selected class from localStorage
    return localStorage.getItem('evaluations-selected-class') || '';
  });
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showAutoGrading, setShowAutoGrading] = useState(false);
  // Rank of each student (by CPF) after the last automatic correction; the rows follow this order
  const [rankByCPF, setRankByCPF] = useState<Record<string, number>>({});

  const currentGoals = selectedClass?.goals ?? [];

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const classesData = await classService.getAllClasses();
      setClasses(classesData);
      setHasLoaded(true);
    } catch (error) {
      onError(`Failed to load classes: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Load all classes on component mount
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Update selected class when selectedClassId changes
  useEffect(() => {
    if (selectedClassId) {
      const classObj = classes.find(c => c.id === selectedClassId);
      setSelectedClass(classObj || null);
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassId, classes]);

  // Another class: the popup and the order of the previous one no longer apply
  useEffect(() => {
    setShowAutoGrading(false);
    setRankByCPF({});
  }, [selectedClassId]);

  const handleClassSelection = (classId: string) => {
    setSelectedClassId(classId);
    // Save selected class to localStorage for persistence
    if (classId) {
      localStorage.setItem('evaluations-selected-class', classId);
    } else {
      localStorage.removeItem('evaluations-selected-class');
    }
  };

  const handleEvaluationChange = async (studentCPF: string, goal: string, grade: string | number) => {
    if (!selectedClass) {
      onError('No class selected');
      return;
    }

    try {
      await enrollmentService.updateEvaluation(selectedClass.id, studentCPF, goal, grade);
      // Reload classes to get updated enrollment data
      await loadClasses();
    } catch (error) {
      onError(`Failed to update evaluation: ${(error as Error).message}`);
    }
  };

  // The grades were saved by the server: order the rows by rank and show the new grades
  const handleGraded = (ranking: RankedStudent[]) => {
    setRankByCPF(Object.fromEntries(ranking.map(student => [student.studentId, student.rank])));
    loadClasses();
  };

  if (isLoading && !hasLoaded) {
    return (
      <div className="evaluation-section">
        <h3>Evaluations</h3>
        <div className="evaluation-loading">Loading classes...</div>
      </div>
    );
  }

  // Ranked students first, in rank order; the others follow by name
  const orderedEnrollments = selectedClass
    ? [...selectedClass.enrollments].sort(
        (a, b) =>
          (rankByCPF[a.student.cpf] ?? Infinity) - (rankByCPF[b.student.cpf] ?? Infinity) ||
          a.student.name.localeCompare(b.student.name)
      )
    : [];

  const isNumeric = selectedClass?.gradeType === 'numeric';

  return (
    <div className="evaluation-section">
      <h3>Evaluations</h3>
      
      {/* Class Selection */}
      <div className="class-selection-container">
        <label htmlFor="classSelect">Select Class:</label>
        <select
          id="classSelect"
          value={selectedClassId}
          onChange={(e) => handleClassSelection(e.target.value)}
          className="class-select"
        >
          <option value="">-- Select a class --</option>
          {classes.map((classObj) => (
            <option key={classObj.id} value={classObj.id}>
              {classObj.topic} ({classObj.year}/{classObj.semester})
            </option>
          ))}
        </select>
      </div>

      {!selectedClass && (
        <div className="evaluation-placeholder">
          <h4>No Class Selected</h4>
          <p>Please select a class to view and manage evaluations.</p>
        </div>
      )}

      {selectedClass && selectedClass.enrollments.length === 0 && (
        <div className="evaluation-placeholder">
          <h4>No Students Enrolled</h4>
          <p>This class has no enrolled students yet.</p>
          <p>Add students in the Students tab first.</p>
        </div>
      )}

      {selectedClass && selectedClass.enrollments.length > 0 && (
        <div className="evaluation-table-container">
          {/*Componente de importacao de notas de uma planilha, vai reagir as mudacas do classId */}
          <div>
            <ImportGradeComponent classID={selectedClassId} />
          </div>

          <div className="evaluation-toolbar">
            <h4>{selectedClass.topic} ({selectedClass.year}/{selectedClass.semester})</h4>
            <button
              type="button"
              className="auto-grade-btn"
              data-testid="open-auto-grading"
              onClick={() => setShowAutoGrading(true)}
            >
              <SheetIcon size={18} />
              Auto-grade
            </button>
          </div>

          {Object.keys(rankByCPF).length > 0 && (
            <p className="rank-order-note" data-testid="rank-order-note">
              Ordered by the last automatic correction.{' '}
              <button type="button" className="link-btn" onClick={() => setRankByCPF({})}>
                Back to name order
              </button>
            </p>
          )}

          <div className="evaluation-matrix">
            <table className="evaluation-table">
              <thead>
                <tr>
                  <th className="student-name-header">Student</th>
                  {currentGoals.map(goal => (
                    <th key={goal} className="goal-header">{goal}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderedEnrollments.map(enrollment => {
                  const student = enrollment.student;

                  // Create a map of evaluations for quick lookup
                  const studentEvaluations = enrollment.evaluations.reduce((acc, evaluation) => {
                    acc[evaluation.goal] = String(evaluation.grade);
                    return acc;
                  }, {} as { [goal: string]: string });

                  return (
                    <tr key={student.cpf} className="student-row">
                      <td className="student-name-cell">
                        {rankByCPF[student.cpf] !== undefined && (
                          <span className="rank-badge" data-testid="student-rank">#{rankByCPF[student.cpf]}</span>
                        )}
                        {student.name}
                      </td>
                      {currentGoals.map(goal => {
                        const currentGrade = studentEvaluations[goal] || '';

                        return (
                          <td key={goal} className="evaluation-cell">
                            {isNumeric ? (
                              <NumericGradeInput
                                value={currentGrade}
                                onCommit={(v) =>
                                  handleEvaluationChange(student.cpf, goal, v === '' ? '' : Number(v))
                                }
                                onError={onError}
                              />
                            ) : (
                              <select
                                value={currentGrade}
                                onChange={(e) => handleEvaluationChange(student.cpf, goal, e.target.value)}
                                className={`evaluation-select ${currentGrade ? `grade-${currentGrade.toLowerCase()}` : ''}`}
                              >
                                <option value="">-</option>
                                {GRADES.map(grade => (
                                  <option key={grade} value={grade}>{grade}</option>
                                ))}
                              </select>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAutoGrading && selectedClass && (
        <AutoGrading
          classObj={selectedClass}
          onGraded={handleGraded}
          onClose={() => setShowAutoGrading(false)}
          onError={onError}
        />
      )}
    </div>
  );
};

export default Evaluations;