import os
import json
import re
from flask import Flask, jsonify, send_from_directory, request

app = Flask(__name__, static_folder='frontend')

# Paths to data files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_local_path = os.path.join(BASE_DIR, "subset_40_stratified.jsonl")
STRATIFIED_JSONL_PATH = _local_path if os.path.exists(_local_path) else "d:/UCL/diagnosis_system/trajectory_run_20260302_011332/analysis/subset_40_stratified.jsonl"

def find_latest_annotation_file(keyword, fallback_filename):
    """
    Finds the most recently modified .json file in BASE_DIR that contains `keyword` (case-insensitive).
    Falls back to a default path if none found.
    """
    candidate_files = []
    try:
        if os.path.exists(BASE_DIR):
            for filename in os.listdir(BASE_DIR):
                if filename.lower().endswith(".json"):
                    # Check keyword match
                    if keyword.lower() in filename.lower():
                        # Avoid matching Chenyi's files for Arun's keyword if the file is Chenyi's main file
                        if keyword.lower() == "arun" and "chenyi" in filename.lower() and filename.lower().startswith("chenyi"):
                            continue
                        if keyword.lower() == "chenyi" and "arun" in filename.lower() and filename.lower().startswith("arun"):
                            continue
                        
                        full_path = os.path.join(BASE_DIR, filename)
                        if os.path.isfile(full_path):
                            candidate_files.append(full_path)
    except Exception as e:
        print(f"Error scanning directory for keyword '{keyword}': {e}")
        
    if candidate_files:
        # Sort by modification time (most recent first)
        candidate_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        return candidate_files[0]
        
    return os.path.join(BASE_DIR, fallback_filename)


def parse_reasoning_trace(trace_str):
    if not trace_str:
        return []
    
    # Split by '<think>' to isolate each cycle
    parts = trace_str.split('<think>')
    cycles = []
    
    for i, part in enumerate(parts[1:]):
        if '</think>' in part:
            think_content, rest = part.split('</think>', 1)
        else:
            think_content = part
            rest = ""
        
        think_content = think_content.strip()
        
        # Extract search content if any
        search_match = re.search(r'<search>(.*?)</search>', rest, re.DOTALL)
        search_content = search_match.group(1).strip() if search_match else ""
        
        # Extract information content if any
        info_match = re.search(r'<information>(.*?)</information>', rest, re.DOTALL)
        info_content = info_match.group(1).strip() if info_match else ""
        
        # Clean any remaining XML tags from other parts
        clean_rest = re.sub(r'</?(search|information)>', '', rest).strip()
        
        cycles.append({
            "cycle_idx": i,
            "think": think_content,
            "search": search_content,
            "information": info_content,
            "rest": clean_rest
        })
        
    return cycles

def load_annotations(file_path):
    if not os.path.exists(file_path):
        return {}
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Map by traj_idx
            return {t['traj_idx']: t for t in data.get('trajectories', [])}
    except Exception as e:
        print(f"Error loading annotations from {file_path}: {e}")
        return {}

def load_stratified_traces():
    if not os.path.exists(STRATIFIED_JSONL_PATH):
        print(f"Stratified traces not found at {STRATIFIED_JSONL_PATH}")
        return {}
    
    traces = {}
    try:
        with open(STRATIFIED_JSONL_PATH, 'r', encoding='utf-8') as f:
            for idx, line in enumerate(f):
                if not line.strip():
                    continue
                data = json.loads(line)
                # The line index (0-indexed) in the stratified file corresponds to traj_idx
                traces[idx] = data
    except Exception as e:
        print(f"Error loading stratified traces: {e}")
    return traces

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'compare.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

def merge_trajectories(arun_annots, chenyi_annots, stratified_traces):
    # We compare trajectories that are common or present in the annotation sets
    annotated_keys = set(arun_annots.keys()).union(set(chenyi_annots.keys()))
    
    merged_trajectories = []
    
    for traj_idx in sorted(annotated_keys):
        arun_t = arun_annots.get(traj_idx)
        chenyi_t = chenyi_annots.get(traj_idx)
        orig_t = stratified_traces.get(traj_idx)
        
        # If there is no original trace, construct a basic shell so we don't crash
        if not orig_t:
            orig_t = {
                "question": arun_t.get("question") if arun_t else (chenyi_t.get("question") if chenyi_t else "Unknown Question"),
                "golden_answers": [],
                "final_answer": "No original trace loaded",
                "is_correct": False,
                "score": 0.0,
                "data_source": "unknown",
                "full_conversation": []
            }
            
        # Build maps for annotations steps
        arun_steps = {s['step_key']: s for s in arun_t.get('steps', [])} if arun_t else {}
        chenyi_steps = {s['step_key']: s for s in chenyi_t.get('steps', [])} if chenyi_t else {}
        
        original_steps = []
        
        # Align chronologically
        coord_round_count = 1
        expert_call_count = 0
        
        # If full_conversation is empty, reconstruct original_steps from the annotations union
        if not orig_t.get('full_conversation'):
            all_keys = set(arun_steps.keys()).union(set(chenyi_steps.keys()))
            
            coord_rounds = []
            expert_cis = set()
            has_final_answer = "final_answer" in all_keys
            
            for key in all_keys:
                if key.startswith("coord_r"):
                    try:
                        coord_rounds.append(int(key[7:]))
                    except ValueError:
                        pass
                elif key.startswith("expert_call_ci"):
                    try:
                        expert_cis.add(int(key[14:]))
                    except ValueError:
                        pass
                elif key.startswith("expert_ci"):
                    match = re.match(r"expert_ci(\d+)_cycle", key)
                    if match:
                        expert_cis.add(int(match.group(1)))
                elif key.startswith("expert_sub_ci"):
                    match = re.match(r"expert_sub_ci(\d+)_s", key)
                    if match:
                        expert_cis.add(int(match.group(1)))
            
            max_coord_round = max(coord_rounds) if coord_rounds else 0
            max_expert_ci = max(expert_cis) if expert_cis else -1
            
            limit = max(max_coord_round, max_expert_ci + 1)
            for r in range(1, limit + 1):
                coord_key = f"coord_r{r}"
                if coord_key in all_keys or r <= max_coord_round:
                    original_steps.append({
                        "type": "coordinator_thinking",
                        "step_key": coord_key,
                        "round": r,
                        "content": "Original content not available (trajectory not in subset_40_stratified.jsonl)",
                        "annotations": {
                            "arun": arun_steps.get(coord_key),
                            "chenyi": chenyi_steps.get(coord_key)
                        }
                    })
                
                ci = r - 1
                expert_call_key = f"expert_call_ci{ci}"
                has_expert_call = expert_call_key in all_keys
                
                ci_cycle_keys = []
                for key in all_keys:
                    if key.startswith(f"expert_ci{ci}_cycle") or key.startswith(f"expert_sub_ci{ci}_s"):
                        ci_cycle_keys.append(key)
                
                if has_expert_call or ci_cycle_keys or ci in expert_cis:
                    original_steps.append({
                        "type": "expert_call",
                        "step_key": expert_call_key,
                        "round": r,
                        "expert_id": 0,
                        "call_index": ci,
                        "sub_question": "Original sub-question not available",
                        "annotations": {
                            "arun": arun_steps.get(expert_call_key),
                            "chenyi": chenyi_steps.get(expert_call_key)
                        }
                    })
                    
                    c_indexes = set()
                    for key in ci_cycle_keys:
                        if key.startswith(f"expert_ci{ci}_cycle"):
                            try:
                                c_indexes.add(int(key.split("cycle")[1]))
                            except (ValueError, IndexError):
                                pass
                        elif key.startswith(f"expert_sub_ci{ci}_s"):
                            try:
                                s_idx = int(key.split("_s")[1])
                                c_indexes.add(s_idx // 2)
                            except (ValueError, IndexError):
                                pass
                    
                    if c_indexes:
                        parsed_cycles = []
                        for c_idx in sorted(c_indexes):
                            arun_key = f"expert_ci{ci}_cycle{c_idx}"
                            
                            chenyi_sub_steps = {}
                            prefix = f"expert_sub_ci{ci}_s"
                            for skey, sval in chenyi_steps.items():
                                if skey.startswith(prefix):
                                    try:
                                        step_idx = int(skey[len(prefix):])
                                        chenyi_sub_steps[step_idx] = sval
                                    except ValueError:
                                        pass
                            
                            c_chenyi_steps = [sval for sidx, sval in sorted(chenyi_sub_steps.items()) if sidx // 2 == c_idx]
                            
                            chenyi_think = None
                            chenyi_action = None
                            for s in c_chenyi_steps:
                                if s.get('kind') == 'think':
                                    chenyi_think = s
                                else:
                                    chenyi_action = s
                                    
                            if len(c_chenyi_steps) == 1 and not chenyi_think:
                                if c_chenyi_steps[0].get('kind') == 'think':
                                    chenyi_think = c_chenyi_steps[0]
                                else:
                                    chenyi_action = c_chenyi_steps[0]
                            
                            parsed_cycles.append({
                                "cycle_idx": c_idx,
                                "think": "",
                                "search": "",
                                "information": "",
                                "rest": "",
                                "annotations": {
                                    "arun": arun_steps.get(arun_key),
                                    "chenyi_think": chenyi_think,
                                    "chenyi_action": chenyi_action,
                                    "chenyi": chenyi_steps.get(arun_key)
                                }
                            })
                        
                        original_steps.append({
                            "type": "expert_response",
                            "round": r,
                            "expert_id": 0,
                            "call_index": ci,
                            "answer": "Original response not available",
                            "success": True,
                            "error": "",
                            "total_queries": 0,
                            "cycles": parsed_cycles
                        })
            
            if has_final_answer:
                step_key = "final_answer"
                original_steps.append({
                    "type": "final_answer",
                    "step_key": step_key,
                    "content": "Original final answer content not available",
                    "annotations": {
                        "arun": arun_steps.get(step_key),
                        "chenyi": chenyi_steps.get(step_key)
                    }
                })
        else:
            for item in orig_t.get('full_conversation', []):
                item_type = item.get('type')
                
                if item_type == 'initial_question':
                    # Handled at trajectory header level
                    continue
                    
                elif item_type == 'coordinator_thinking':
                    step_key = f"coord_r{coord_round_count}"
                    original_steps.append({
                        "type": "coordinator_thinking",
                        "step_key": step_key,
                        "round": coord_round_count,
                        "content": item.get('content', ''),
                        "annotations": {
                            "arun": arun_steps.get(step_key),
                            "chenyi": chenyi_steps.get(step_key)
                        }
                    })
                    coord_round_count += 1
                    
                elif item_type == 'expert_call':
                    step_key = f"expert_call_ci{expert_call_count}"
                    original_steps.append({
                        "type": "expert_call",
                        "step_key": step_key,
                        "round": item.get('round', 1),
                        "expert_id": item.get('expert_id', 0),
                        "call_index": expert_call_count,
                        "sub_question": item.get('question') or item.get('sub_question') or '',
                        "annotations": {
                            "arun": arun_steps.get(step_key),  # Usually missing in Arun's
                            "chenyi": chenyi_steps.get(step_key)
                        }
                    })
                    
                elif item_type == 'expert_response':
                    round_num = item.get('round', 1)
                    expert_id = item.get('expert_id', 0)
                    reasoning_trace = item.get('reasoning_trace', '')
                    
                    # Parse reasoning trace into cycles
                    cycles = parse_reasoning_trace(reasoning_trace)
                    
                    # Find all Chenyi steps matching this expert call
                    # Chenyi keys format: expert_sub_ci{expert_call_count}_s{X}
                    chenyi_sub_steps = {}
                    prefix = f"expert_sub_ci{expert_call_count}_s"
                    for skey, sval in chenyi_steps.items():
                        if skey.startswith(prefix):
                            try:
                                step_idx = int(skey[len(prefix):])
                                chenyi_sub_steps[step_idx] = sval
                            except ValueError:
                                pass
                    
                    parsed_cycles = []
                    for c in cycles:
                        c_idx = c['cycle_idx']
                        arun_key = f"expert_ci{expert_call_count}_cycle{c_idx}"
                        
                        # Align Chenyi steps for this cycle (heuristic: X // 2 == c_idx)
                        c_chenyi_steps = [sval for sidx, sval in sorted(chenyi_sub_steps.items()) if sidx // 2 == c_idx]
                        
                        # Classify into think and action annotations
                        chenyi_think = None
                        chenyi_action = None
                        for s in c_chenyi_steps:
                            if s.get('kind') == 'think':
                                chenyi_think = s
                            else:
                                chenyi_action = s
                                
                        # If we only have one Chenyi step and it's not think, treat it as action
                        if len(c_chenyi_steps) == 1 and not chenyi_think:
                            if c_chenyi_steps[0].get('kind') == 'think':
                                chenyi_think = c_chenyi_steps[0]
                            else:
                                chenyi_action = c_chenyi_steps[0]
                        elif len(c_chenyi_steps) == 1 and chenyi_think:
                            # If only think is present
                            pass
                            
                        parsed_cycles.append({
                            "cycle_idx": c_idx,
                            "think": c['think'],
                            "search": c['search'],
                            "information": c['information'],
                            "rest": c['rest'],
                            "annotations": {
                                "arun": arun_steps.get(arun_key),
                                "chenyi_think": chenyi_think,
                                "chenyi_action": chenyi_action,
                                "chenyi": chenyi_steps.get(arun_key)
                            }
                        })
                        
                    original_steps.append({
                        "type": "expert_response",
                        "round": round_num,
                        "expert_id": expert_id,
                        "call_index": expert_call_count,
                        "answer": item.get('answer', ''),
                        "success": item.get('success', True),
                        "error": item.get('error', ''),
                        "total_queries": item.get('total_queries', 0),
                        "cycles": parsed_cycles
                    })
                    expert_call_count += 1
                    
                elif item_type == 'final_answer':
                    step_key = "final_answer"
                    original_steps.append({
                        "type": "final_answer",
                        "step_key": step_key,
                        "content": item.get('content', ''),
                        "annotations": {
                            "arun": arun_steps.get(step_key),
                            "chenyi": chenyi_steps.get(step_key)
                        }
                    })

        merged_trajectories.append({
            "traj_idx": traj_idx,
            "question": orig_t.get("question"),
            "golden_answers": orig_t.get("golden_answers"),
            "final_answer": orig_t.get("final_answer"),
            "is_correct": orig_t.get("is_correct"),
            "score": orig_t.get("score"),
            "data_source": orig_t.get("data_source"),
            "original_steps": original_steps
        })

    return merged_trajectories

@app.route('/api/data')
def get_merged_data():
    arun_path = find_latest_annotation_file("arun", "Arun-trajectory_annotations_20260521_000901.json")
    chenyi_path = find_latest_annotation_file("chenyi", "chenyi-trajectory_annotations_20260520_213424.json")
    
    print(f"[LOAD] Dynamically loading latest Arun file: {arun_path}")
    print(f"[LOAD] Dynamically loading latest Chenyi file: {chenyi_path}")
    
    arun_annots = load_annotations(arun_path)
    chenyi_annots = load_annotations(chenyi_path)
    stratified_traces = load_stratified_traces()
    
    merged_trajectories = merge_trajectories(arun_annots, chenyi_annots, stratified_traces)
    
    return jsonify({
        "source_file": "subset_40_stratified.jsonl",
        "arun_file": os.path.basename(arun_path),
        "chenyi_file": os.path.basename(chenyi_path),
        "trajectories": merged_trajectories
    })

@app.route('/api/upload_compare', methods=['POST'])
def upload_compare():
    try:
        # Check if files are uploaded
        if 'arun_file' not in request.files or 'chenyi_file' not in request.files:
            return jsonify({"error": "Both Arun and Chenyi annotation files are required."}), 400
            
        arun_file = request.files['arun_file']
        chenyi_file = request.files['chenyi_file']
        
        arun_data = json.loads(arun_file.read().decode('utf-8'))
        chenyi_data = json.loads(chenyi_file.read().decode('utf-8'))
        
        arun_annots = {t['traj_idx']: t for t in arun_data.get('trajectories', [])}
        chenyi_annots = {t['traj_idx']: t for t in chenyi_data.get('trajectories', [])}
        
        stratified_traces = load_stratified_traces()
        
        merged_trajectories = merge_trajectories(arun_annots, chenyi_annots, stratified_traces)
        
        return jsonify({
            "source_file": "user_uploaded_files",
            "trajectories": merged_trajectories
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error parsing or merging uploaded files: {str(e)}"}), 500

if __name__ == '__main__':
    print("Starting Trajectory Annotation Comparison server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
