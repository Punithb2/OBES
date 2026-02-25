// Default navigations for the base template
export const navigations = [
  { name: "Dashboard", path: "/dashboard/default", icon: "dashboard" }
];

// Navigation items for FACULTY role
export const facultyNavigations = [
  { label: "Faculty", type: "label" },
  { name: "Dashboard", path: "/faculty/dashboard", icon: "dashboard" },
  { name: "Articulation Matrix", path: "/faculty/articulation", icon: "table_view" },
  { name: "Marks Entry", path: "/faculty/marks", icon: "edit" },
  { name: "Indirect CO", path: "/faculty/indirect-co", icon: "description" },
  { name: "CO-PO Attainment", path: "/faculty/copo-attainment", icon: "track_changes" },
  { name: "Course Reports", path: "/faculty/course-reports", icon: "assessment" }, 
  { name: "Student Reports", path: "/faculty/student-reports", icon: "people" }, 
  { name: "Configuration", path: "/faculty/configuration", icon: "settings" }
];

// Navigation items for ADMIN role
export const adminNavigations = [
  { label: "Admin", type: "label" },
  { name: "Dashboard", path: "/admin/dashboard", icon: "dashboard" },
  { name: "Manage Faculty", path: "/admin/faculty", icon: "people" },
  { name: "Manage Courses", path: "/admin/manage-courses", icon: "book" },
  { name: "Assign Courses", path: "/admin/assign-courses", icon: "assignment_ind" },
  { name: "Manage Students", path: "/admin/student-management", icon: "people_alt" },
  { name: "Manage Outcomes", path: "/admin/outcomes", icon: "assignment" },
  { name: "Consolidated Matrix", path: "/admin/consolidation", icon: "grid_on" },
  { name: "Program Matrix", path: "/admin/program-matrix", icon: "table_chart" },
  { name: "Evaluation Result", path: "/admin/evaluation-result", icon: "assessment" },
  { name: "Indirect Attainment", path: "/admin/indirect-attainment", icon: "description" },
  { name: "Improvement Plans", path: "/admin/improvement-plans", icon: "build" },
  { name: "Configuration", path: "/admin/configuration", icon: "settings" },
];

// Navigation items for SUPER ADMIN role (FIXED PATHS)
export const superAdminNavigations = [
  { label: "Super Admin", type: "label" },
  { name: "Dashboard", path: "/superadmin/dashboard", icon: "dashboard" },
  { name: "Department Attainment", path: "/superadmin/attainment", icon: "bar_chart" },
  { name: "Manage Departments", path: "/superadmin/departments", icon: "domain" },
  { name: "Manage Admin", path: "/superadmin/admins", icon: "supervisor_account" }, 
];