from .models import Course, Mark, ArticulationMatrix, Configuration

def get_scheme_settings(course):
    if course.scheme and course.scheme.settings:
        return course.scheme.settings
    
    try:
        global_config = Configuration.objects.get(key='global_scheme_settings')
        return global_config.value
    except Configuration.DoesNotExist:
        return {
            "pass_criteria": 50,
            "attainment_levels": {"level_3": 70, "level_2": 60, "level_1": 50},
            "weightage": {"direct": 80, "indirect": 20},
            "po_calculation": {"normalization_factor": 3}
        }

def calculate_course_attainment(course_id):
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return {"error": "Course not found"}

    settings = get_scheme_settings(course)
    marks = Mark.objects.filter(course=course)
    
    co_stats = _calculate_co_levels(marks, course, settings)
    final_scores = _calculate_final_score_index(co_stats, course, settings)
    po_stats = _calculate_po_attainment(course, final_scores, settings)
    
    return {
        "course_id": course.id,
        "scheme_used": course.scheme.name if course.scheme else "Global Default",
        "co_attainment": final_scores,
        "po_attainment": po_stats
    }

def _calculate_co_levels(marks, course, settings):
    pass_threshold = float(settings.get('pass_criteria', 50))
    levels_dict = settings.get('attainment_levels', {'level_3': 70, 'level_2': 60, 'level_1': 50})
    
    course_type = course.settings.get('courseType', 'Theory') if course.settings else 'Theory'
    
    sorted_levels = []
    for k, v in levels_dict.items():
        lvl_num = int(''.join(filter(str.isdigit, k))) if any(c.isdigit() for c in k) else 0
        sorted_levels.append({'level': lvl_num, 'threshold': float(v)})
    sorted_levels.sort(key=lambda x: x['threshold'], reverse=True)
    
    def get_level(percentage):
        for l in sorted_levels:
            if percentage >= l['threshold']:
                return l['level']
        return 0

    tools = course.assessment_tools if isinstance(course.assessment_tools, list) else []
    see_tool = next((t for t in tools if t.get('type') in ['Semester End Exam', 'SEE']), None)
    internal_tools = [t for t in tools if t.get('type') not in ['Semester End Exam', 'SEE', 'Improvement Test']]
    
    co_list = []
    if isinstance(course.cos, list):
        co_list = [c.get('id') if isinstance(c, dict) else c for c in course.cos]
        
    student_marks = {}
    for m in marks:
        if m.student.id not in student_marks:
            student_marks[m.student.id] = []
        student_marks[m.student.id].append(m)

    def is_absent(val):
        return str(val).strip().upper() in ['AB', 'ABSENT', 'A', 'NA', '-']

    def get_total(scores, co_keys):
        t = 0
        for k, v in scores.items():
            if k in co_keys and not str(k).startswith('_'):
                try:
                    t += float(v)
                except ValueError:
                    pass
        return t
        
    co_results = {co: {'cie_attempts': 0, 'cie_passed': 0, 'see_attempts': 0, 'see_passed': 0} for co in co_list}

    def normalize(s): 
        return ''.join(filter(str.isalnum, str(s).lower()))

    for student_id, s_marks in student_marks.items():
        if see_tool:
            see_record = next((m for m in s_marks if m.assessment_name in [see_tool.get('name'), 'SEE', 'Semester End Exam']), None)
            if see_record and see_record.scores:
                vals = list(see_record.scores.values())
                if not any(is_absent(v) for v in vals):
                    obt = sum(float(v) for v in vals if str(v).replace('.','',1).isdigit())
                    target = (float(see_tool.get('maxMarks', 100)) * pass_threshold) / 100.0
                    
                    see_map = list(see_tool.get('coDistribution', {}).keys())
                    if not see_map:
                        see_map = co_list
                        
                    for co in see_map:
                        if co in co_results:
                            co_results[co]['see_attempts'] += 1
                            if obt >= target:
                                co_results[co]['see_passed'] += 1
        
        for tool in internal_tools:
            tool_name = tool.get('name')
            record = next((m for m in s_marks if m.assessment_name == tool_name), None)
            raw_scores = record.scores if record else {}
            
            # --- THE FIX: ALWAYS READ THE CO DISTRIBUTION FIRST ---
            co_dist = tool.get('coDistribution', {})
            if not co_dist and tool.get('maxMarks'):
                 co_dist = {co: tool.get('maxMarks') for co in co_list}
            
            # --- PROPORTIONAL MATHEMATICS ---
            def normalize_scores_for_calc(sc):
                if not sc: return {}
                norm = dict(sc)
                if course_type == 'Lab' and tool.get('type') == 'Internal Assessment':
                    t_val = norm.get('Test Marks')
                    c_val = norm.get('Continuous Eval')
                    if t_val is not None or c_val is not None:
                        if is_absent(t_val) and is_absent(c_val):
                            for c in co_dist.keys(): norm[c] = 'AB'
                        else:
                            try:
                                t_tot = float(t_val or 0) + float(c_val or 0)
                                max_m = float(tool.get('maxMarks', 1))
                                # Calculate ratio: (Total Obtained / Tool Max Marks) * CO Max Marks
                                for c, c_max in co_dist.items():
                                    norm[c] = (t_tot / max_m) * float(c_max) if max_m > 0 else 0
                            except ValueError:
                                for c in co_dist.keys(): norm[c] = 'AB'
                elif tool.get('type') in ['Activity', 'Laboratory']:
                    s_val = norm.get('Score')
                    if s_val is not None:
                        for c in co_list: norm[c] = s_val
                return norm

            scores = normalize_scores_for_calc(raw_scores)

            imp_record = next((m for m in s_marks if 
                normalize(m.improvement_test_for) == normalize(tool_name) or 
                normalize(m.scores.get('_improvementTarget', '')) == normalize(tool_name)
            ), None)

            if imp_record and imp_record.scores:
                imp_scores = normalize_scores_for_calc(imp_record.scores)
                orig_tot = get_total(scores, co_dist.keys())
                imp_tot = get_total(imp_scores, co_dist.keys())
                if imp_tot > orig_tot:
                    scores = imp_scores
            
            for co, max_val in co_dist.items():
                if co not in co_results:
                    co_results[co] = {'cie_attempts': 0, 'cie_passed': 0, 'see_attempts': 0, 'see_passed': 0}
                
                val = scores.get(co)
                if val is None and len([k for k in scores if not k.startswith('_')]) == 1:
                    val = list(scores.values())[0]

                if not is_absent(val) and val is not None:
                    try:
                        num_val = float(val)
                        co_results[co]['cie_attempts'] += 1
                        if num_val >= (float(max_val) * pass_threshold / 100.0):
                            co_results[co]['cie_passed'] += 1
                    except ValueError:
                        pass

    final_co_stats = {}
    for co, data in co_results.items():
        cie_perc = (data['cie_passed'] / data['cie_attempts'] * 100) if data['cie_attempts'] > 0 else 0
        see_perc = (data['see_passed'] / data['see_attempts'] * 100) if data['see_attempts'] > 0 else 0
        
        final_co_stats[co] = {
            'cie_level': get_level(cie_perc),
            'see_level': get_level(see_perc)
        }
        
    return final_co_stats

def _calculate_final_score_index(co_stats, course, settings):
    w_direct = settings.get('weightage', {}).get('direct', 80) / 100.0
    w_indirect = settings.get('weightage', {}).get('indirect', 20) / 100.0
    
    indirect_attainment_map = course.settings.get('indirect_attainment', {}) if course.settings else {}
    
    final_scores = []
    for co_id, stats in co_stats.items():
        direct = (stats['cie_level'] + stats['see_level']) / 2.0
        indirect = float(indirect_attainment_map.get(co_id, 0.0))
        score_index = (direct * w_direct) + (indirect * w_indirect)
        
        final_scores.append({
            "co": co_id,
            "cie_level": stats['cie_level'],
            "see_level": stats['see_level'],
            "direct_attainment": round(direct, 2),
            "indirect_attainment": round(indirect, 2),
            "score_index": round(score_index, 2)
        })
        
    return final_scores

def _calculate_po_attainment(course, final_scores, settings):
    try:
        matrix_record = ArticulationMatrix.objects.get(course=course)
        matrix = matrix_record.matrix
    except ArticulationMatrix.DoesNotExist:
        return []

    norm_factor = settings.get('po_calculation', {}).get('normalization_factor', 3)
    po_sums = {}
    po_counts = {}

    for score_data in final_scores:
        co_id = score_data['co']
        score_index = score_data['score_index']
        mappings = matrix.get(co_id, {})
        
        for po_id, map_val in mappings.items():
            if map_val and str(map_val).strip() != '-':
                map_val_float = float(map_val)
                actual_val = (map_val_float * score_index) / norm_factor
                
                po_sums[po_id] = po_sums.get(po_id, 0) + actual_val
                po_counts[po_id] = po_counts.get(po_id, 0) + 1

    po_attainment = []
    for po_id in po_sums:
        avg = po_sums[po_id] / po_counts[po_id]
        po_attainment.append({
            "po": po_id,
            "attained": round(avg, 2),
            "percentage": round((avg / norm_factor) * 100, 2)
        })

    return po_attainment