import React from 'react';
import { Class } from '../types/Class';

interface ClassFilterProps {
  classes: Class[];
  selectedClass: Class | null;                  // null means "All Students"
  onSelectClass: (classObj: Class | null) => void;
}

/** Drop-down that restricts the student list to the students of one class. */
const ClassFilter: React.FC<ClassFilterProps> = ({ classes, selectedClass, onSelectClass }) => (
  <div className="class-selection">
    <label htmlFor="class-select">Filter by Class:</label>
    <select
      id="class-select"
      value={selectedClass ? selectedClass.id : ''}
      onChange={(e) => onSelectClass(classes.find(c => c.id === e.target.value) || null)}
      className="class-selector"
    >
      <option value="">All Students</option>
      {classes.map((classObj) => (
        <option key={classObj.id} value={classObj.id}>
          {classObj.topic} ({classObj.year}/{classObj.semester})
        </option>
      ))}
    </select>
  </div>
);

export default ClassFilter;
