export const departments = [
    { id: 'D01', name: 'Computer Science & Engineering' },
    { id: 'D02', name: 'Electronics & Communication Engineering' },
    { id: 'D03', name: 'Mechanical Engineering' },
];

export const users = [
    { id: 'U001', name: 'Super Admin', email: 'superadmin@obe.com', role: 'superadmin' },
    { id: 'U002', name: 'Dr. Alan Turing', email: 'admin@obe.com', role: 'admin', departmentId: 'D01' },
    { id: 'U003', name: 'Prof. Ada Lovelace', email: 'faculty@obe.com', role: 'faculty', departmentId: 'D01' },
    { id: 'U004', name: 'Dr. Grace Hopper', email: 'faculty2@obe.com', role: 'faculty', departmentId: 'D01' },
    { id: 'U005', name: 'Dr. Maxwell', email: 'eceadmin@obe.com', role: 'admin', departmentId: 'D02' },
    { id: 'U006', name: 'Prof. Donald Knuth', email: 'faculty3@obe.com', role: 'faculty', departmentId: 'D01' },
    { id: 'U007', name: 'Prof. Vint Cerf', email: 'faculty4@obe.com', role: 'faculty', departmentId: 'D01' },
    { id: 'U008', name: 'Prof. Tim Berners-Lee', email: 'faculty5@obe.com', role: 'faculty', departmentId: 'D01' },
    { id: 'U009', name: 'Prof. Barbara Liskov', email: 'faculty6@obe.com', role: 'faculty', departmentId: 'D01' },
    { id: 'U010', name: 'Prof. Shafi Goldwasser', email: 'faculty7@obe.com', role: 'faculty', departmentId: 'D01' },
];

const facultyIds = users.filter(u => u.role === 'faculty' && u.departmentId === 'D01').map(u => u.id);

export const pos = [
  { id: 'PO1', description: 'Engineering knowledge' },
  { id: 'PO2', description: 'Problem analysis' },
  { id: 'PO3', description: 'Design/development of solutions' },
  { id: 'PO4', description: 'Conduct investigations of complex problems' },
  { id: 'PO5', description: 'Modern tool usage' },
  { id: 'PO6', description: 'The engineer and society' },
  { id: 'PO7', description: 'Environment and sustainability' },
  { id: 'PO8', description: 'Ethics' },
  { id: 'PO9', description: 'Individual and team work' },
  { id: 'PO10', description: 'Communication' },
  { id: 'PO11', description: 'Project management and finance' },
  { id: 'PO12', description: 'Life-long learning' },
];

export const psos = [
  { id: 'PSO1', description: 'Analyze and develop computer programs in the areas related to algorithms, system software, multimedia, web design, big data analytics, and networking for efficient design of computer-based systems of varying complexity.' },
  { id: 'PSO2', description: 'Apply standard practices and strategies in software project development using open-ended programming environments to deliver a quality product for business success.' },
];

const allOutcomes = [...pos, ...psos];

const courseDefinitions = [
    // SEM 1
    { id: 'C101', code: 'CS101', name: 'Introduction to Programming', semester: 1 },
    { id: 'C102', code: 'CS102', name: 'Digital Logic Design', semester: 1 },
    { id: 'C103', code: 'CS103', name: 'Calculus & Linear Algebra', semester: 1 },
    // SEM 2
    { id: 'C201', code: 'CS201', name: 'Discrete Mathematics', semester: 2 },
    { id: 'C202', code: 'CS202', name: 'Web Technologies', semester: 2 },
    { id: 'C203', code: 'CS203', name: 'Engineering Physics', semester: 2 },
    // SEM 3
    { id: 'C001', code: 'CS301', name: 'Data Structures and Algorithms', semester: 3 },
    { id: 'C002', code: 'CS302', name: 'Database Management Systems', semester: 3 },
    { id: 'C003', code: 'CS303', name: 'Operating Systems', semester: 3 },
    // SEM 4
    { id: 'C004', code: 'CS401', name: 'Computer Networks', semester: 4 },
    { id: 'C005', code: 'CS402', name: 'Software Engineering', semester: 4 },
    { id: 'C006', code: 'CS403', name: 'Artificial Intelligence', semester: 4 },
    // SEM 5
    { id: 'C501', code: 'CS501', name: 'Theory of Computation', semester: 5 },
    { id: 'C502', code: 'CS502', name: 'Microprocessors', semester: 5 },
    { id: 'C503', code: 'CS503', name: 'Computer Graphics', semester: 5 },
    // SEM 6
    { id: 'C601', code: 'CS601', name: 'Compiler Design', semester: 6 },
    { id: 'C602', code: 'CS602', name: 'Cryptography', semester: 6 },
    { id: 'C603', code: 'CS603', name: 'Machine Learning', semester: 6 },
    // SEM 7
    { id: 'C701', code: 'CS701', name: 'Cloud Computing', semester: 7 },
    { id: 'C702', code: 'CS702', name: 'Big Data Analytics', semester: 7 },
    { id: 'C703', code: 'CS703', name: 'Project Work Phase 1', semester: 7 },
    // SEM 8
    { id: 'C801', code: 'CS801', name: 'Internship', semester: 8 },
    { id: 'C802', code: 'CS802', name: 'Project Work Phase 2', semester: 8 },
    { id: 'C803', code: 'CS803', name: 'Professional Elective V', semester: 8 },
];

const generateCOs = (courseId, courseName) => {
    const genericDescriptions = [
        `Understand fundamental concepts of ${courseName}.`,
        `Analyze key components and algorithms in ${courseName}.`,
        `Apply theoretical knowledge to solve practical problems in ${courseName}.`,
        `Evaluate different approaches and techniques within ${courseName}.`,
        `Design and implement solutions related to ${courseName}.`,
    ];
    return Array.from({ length: 5 }, (_, i) => ({
        id: `${courseId}.${i + 1}`,
        description: genericDescriptions[i],
        kLevel: `K${i % 5 + 2}`,
    }));
};

export const courses = courseDefinitions.map((def, index) => ({
    ...def,
    cos: generateCOs(def.id, def.name),
    assignedFacultyId: facultyIds[index % facultyIds.length],
}));


export const articulationMatrix = {};
courses.forEach(course => {
    const courseMatrix = {};
    course.cos.forEach(co => {
        const coMatrix = {};
        const numMappings = Math.floor(Math.random() * 4) + 2; // 2 to 5 mappings per CO
        for (let i = 0; i < numMappings; i++) {
            const outcome = allOutcomes[Math.floor(Math.random() * allOutcomes.length)];
            coMatrix[outcome.id] = Math.floor(Math.random() * 3) + 1; // Correlation 1, 2, or 3
        }
        courseMatrix[co.id] = coMatrix;
    });
    articulationMatrix[course.id] = courseMatrix;
});


export const studentsByCourse = {};
courses.forEach((course, courseIndex) => {
    const studentCount = Math.floor(Math.random() * 15) + 15; // 15 to 29 students
    studentsByCourse[course.id] = Array.from({ length: studentCount }, (_, i) => ({
        id: `S${course.id}-${i + 1}`,
        name: `${course.code} Student ${i + 1}`,
        usn: `1CR${23 - Math.floor(course.semester/2)}CS${(courseIndex * 30 + i + 1).toString().padStart(3, '0')}`,
    }));
});


export const coAttainmentData = courses[0].cos.map((co, index) => ({
    name: co.id.split('.')[1],
    target: 60,
    attained: 55 + index * 5 - Math.random() * 10,
}));

export const poAttainmentData = pos.map((po, index) => ({
    name: po.id,
    target: 70,
    attained: 65 + index * 2 - Math.random() * 15,
}));

export const attainmentSummary = {
    totalStudents: 120,
    studentsReachedTarget: 96,
    coAttainmentLevel: 2.8,
    directAttainment: 78.5,
    indirectAttainment: 85.0,
    totalAttainment: 80.2
};

export const coursePerformanceData = courses.map(course => ({
    name: `${course.code} ${course.name.split(' ')[0]}`,
    courseId: course.id,
    target: 70,
    attained: Math.floor(Math.random() * 30) + 60, // Attainment between 60 and 90
}));