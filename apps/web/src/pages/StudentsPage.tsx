import React, { useState, useEffect } from 'react';
import { studentService } from '../services/studentService';
import { Student } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { Users, Plus, Search, RefreshCw, GraduationCap } from 'lucide-react';
import { getErrorMessage } from '../services/api';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Student Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDepartment, setNewDepartment] = useState('Computer Engineering');
  const [newSemester, setNewSemester] = useState('4');
  const [newMaxLimit, setNewMaxLimit] = useState('5');

  const departments = ['Computer Engineering', 'Electronics & Comm', 'Mechanical', 'Civil', 'Electrical', 'Information Technology'];

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const res = await studentService.getStudents({
        search: search || undefined,
        department: selectedDept !== 'all' ? selectedDept : undefined,
        limit: 100,
      });
      setStudents(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [selectedDept]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await studentService.createStudent({
        studentId: newStudentId.toUpperCase(),
        name: newName,
        email: newEmail,
        phone: newPhone,
        department: newDepartment,
        semester: parseInt(newSemester, 10) || 1,
        maxBorrowLimit: parseInt(newMaxLimit, 10) || 5,
      });
      setIsAddModalOpen(false);
      setNewStudentId('');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      loadStudents();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Student Borrowing Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Student borrow limits, active loans tracking, and departmental registration
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Register Student
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStudents}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Filter and Search */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by student name, roll number or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={loadStudents}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll / Enrolment #</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Loan Quota (Used / Max)</th>
                  <th>Eligibility</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading students list...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      No student records found.
                    </td>
                  </tr>
                ) : (
                  students.map((st) => {
                    const remaining = st.maxBorrowLimit - st.currentBorrowedCount;
                    const percent = Math.min(100, (st.currentBorrowedCount / st.maxBorrowLimit) * 100);

                    return (
                      <tr key={st._id}>
                        <td className="font-mono font-bold text-xs text-blue-600">
                          {st.studentId}
                        </td>
                        <td>
                          <div className="font-semibold text-foreground">{st.name}</div>
                          <div className="text-[11px] text-muted-foreground">Semester {st.semester}</div>
                        </td>
                        <td className="text-xs text-muted-foreground">{st.department}</td>
                        <td>
                          <div className="text-xs text-foreground">{st.email}</div>
                          <div className="text-[11px] text-muted-foreground">{st.phone || '—'}</div>
                        </td>
                        <td>
                          <div className="space-y-1 w-32">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span>{st.currentBorrowedCount} / {st.maxBorrowLimit} items</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  percent >= 100 ? 'bg-rose-500' : percent >= 60 ? 'bg-amber-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          {remaining <= 0 ? (
                            <Badge variant="overdue">Quota Full</Badge>
                          ) : (
                            <Badge variant="available">{remaining} slot(s) free</Badge>
                          )}
                        </td>
                        <td>
                          <Badge status={st.isActive ? 'available' : 'overdue'}>
                            {st.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Register Student */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Student"
        description="Enroll student with borrowing quota into department registry"
        size="md"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Student Roll No"
              placeholder="e.g. CS-2024-055"
              value={newStudentId}
              onChange={(e) => setNewStudentId(e.target.value)}
              required
            />
            <Input
              label="Full Name"
              placeholder="e.g. Alex Johnson"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              placeholder="alex@department.edu"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="+91 9876543210"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Department
              </label>
              <select
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2 text-xs"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <Input
              label="Semester"
              type="number"
              min="1"
              max="8"
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
            />

            <Input
              label="Max Borrow Quota"
              type="number"
              min="1"
              max="10"
              value={newMaxLimit}
              onChange={(e) => setNewMaxLimit(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
