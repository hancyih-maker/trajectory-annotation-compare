document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('mainContent');
    const overallAgreementEl = document.getElementById('overallAgreement');
    const coordinatorAgreementEl = document.getElementById('coordinatorAgreement');
    const expertAgreementEl = document.getElementById('expertAgreement');
    const finalAnswerAgreementEl = document.getElementById('finalAnswerAgreement');
    const comparableCountEl = document.getElementById('comparableCount');
    const unannotatedCountEl = document.getElementById('unannotatedCount');
    const trajectoriesContainer = document.getElementById('trajectoriesContainer');
    const trajectoryTemplate = document.getElementById('trajectoryTemplate');
    const searchInput = document.getElementById('searchInput');
    const filterDisagreementsBtn = document.getElementById('filterDisagreementsBtn');

    // Tab and Upload DOM elements
    const modePreloadedBtn = document.getElementById('modePreloadedBtn');
    const modeUploadBtn = document.getElementById('modeUploadBtn');
    const uploadSection = document.getElementById('uploadSection');
    const fileInput1 = document.getElementById('file1');
    const fileInput2 = document.getElementById('file2');
    const fileName1 = document.getElementById('fileName1');
    const fileName2 = document.getElementById('fileName2');
    const compareSubmitBtn = document.getElementById('compareSubmitBtn');
    const statusText = document.getElementById('statusText');

    let allTrajectories = [];
    let filterOnlyDisagreements = false;
    let selectedFile1 = null;
    let selectedFile2 = null;

    // Fetch preloaded data from Flask backend
    fetchData();

    function fetchData() {
        fetch('/api/data')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                allTrajectories = data.trajectories || [];
                processAndRender();
                if (data.arun_file && data.chenyi_file) {
                    statusText.innerHTML = `Active Server Mode: Preloaded Datasets Loaded Successfully<br><span style="font-size: 0.775rem; opacity: 0.8; font-weight: normal;">Arun: <strong>${data.arun_file}</strong> | Chenyi: <strong>${data.chenyi_file}</strong></span>`;
                } else {
                    statusText.textContent = "Active Server Mode: Preloaded Datasets Loaded Successfully";
                }
            })
            .catch(error => {
                alert(`Error fetching data from server: ${error.message}`);
                console.error("Fetch error:", error);
            });
    }

    // Tab switching handlers
    modePreloadedBtn.addEventListener('click', () => {
        modePreloadedBtn.classList.add('active-tab');
        modeUploadBtn.classList.remove('active-tab');
        uploadSection.classList.add('hidden');
        statusText.textContent = "Loading preloaded datasets...";
        fetchData();
    });

    modeUploadBtn.addEventListener('click', () => {
        modeUploadBtn.classList.add('active-tab');
        modePreloadedBtn.classList.remove('active-tab');
        uploadSection.classList.remove('hidden');
        updateUploadStatusText();
    });

    // File selection handlers
    fileInput1.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile1 = e.target.files[0];
            fileName1.textContent = selectedFile1.name;
        } else {
            selectedFile1 = null;
            fileName1.textContent = "Choose file...";
        }
        validateUploadInputs();
    });

    fileInput2.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile2 = e.target.files[0];
            fileName2.textContent = selectedFile2.name;
        } else {
            selectedFile2 = null;
            fileName2.textContent = "Choose file...";
        }
        validateUploadInputs();
    });

    function validateUploadInputs() {
        updateUploadStatusText();
        if (selectedFile1 && selectedFile2) {
            compareSubmitBtn.disabled = false;
            compareSubmitBtn.style.cursor = 'pointer';
            compareSubmitBtn.style.opacity = '1';
        } else {
            compareSubmitBtn.disabled = true;
            compareSubmitBtn.style.cursor = 'not-allowed';
            compareSubmitBtn.style.opacity = '0.6';
        }
    }

    function updateUploadStatusText() {
        if (selectedFile1 && selectedFile2) {
            statusText.textContent = "Ready to Compare: Uploaded files selected.";
        } else {
            statusText.textContent = "Upload Mode: Please select both Arun and Chenyi JSON files.";
        }
    }

    // Submit Custom Files Handler
    compareSubmitBtn.addEventListener('click', () => {
        if (!selectedFile1 || !selectedFile2) return;

        statusText.textContent = "Processing and Merging Datasets...";
        
        const formData = new FormData();
        formData.append('arun_file', selectedFile1);
        formData.append('chenyi_file', selectedFile2);

        fetch('/api/upload_compare', {
            method: 'POST',
            body: formData
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.error || `HTTP error! ${res.status}`); });
            }
            return res.json();
        })
        .then(data => {
            allTrajectories = data.trajectories || [];
            processAndRender();
            statusText.textContent = "Custom Mode: Uploaded Annotation Datasets Merged Successfully";
        })
        .catch(error => {
            alert(`Alignment Error: ${error.message}`);
            statusText.textContent = "Error aligning custom files. Please verify JSON schema.";
            console.error("Upload comparison error:", error);
        });
    });

    function normalizeLabel(label) {
        if (!label) return "none";
        return label.trim().toLowerCase();
    }

    function getLabelClass(label) {
        const norm = normalizeLabel(label);
        if (norm.includes('info')) return 'label-informational';
        if (norm.includes('warn')) return 'label-warning';
        if (norm.includes('crit')) return 'label-critical';
        if (norm.includes('err')) return 'label-error';
        return 'label-none';
    }

    function isAnnotated(label) {
        const norm = normalizeLabel(label);
        return norm !== 'none' && norm !== '/' && norm !== '';
    }

    function processAndRender() {
        trajectoriesContainer.innerHTML = '';

        let totalOverallSteps = 0;
        let matchingOverallSteps = 0;

        let totalCoordinatorThinkingSteps = 0;
        let matchingCoordinatorThinkingSteps = 0;

        let totalExpertResponseSteps = 0;
        let matchingExpertResponseSteps = 0;

        let totalFinalAnswerSteps = 0;
        let matchingFinalAnswerSteps = 0;

        const processedTrajectories = [];

        allTrajectories.forEach(traj => {
            let trajOverallTotal = 0;
            let trajOverallMatch = 0;

            let trajCoordTotal = 0;
            let trajCoordMatch = 0;

            traj.original_steps.forEach(step => {
                if (step.type === 'coordinator_thinking') {
                    const l1 = step.annotations.arun ? step.annotations.arun.label : null;
                    const l2 = step.annotations.chenyi ? step.annotations.chenyi.label : null;

                    if (isAnnotated(l1) && isAnnotated(l2)) {
                        const norm1 = normalizeLabel(l1);
                        const norm2 = normalizeLabel(l2);

                        trajOverallTotal++;
                        totalOverallSteps++;
                        totalCoordinatorThinkingSteps++;
                        trajCoordTotal++;

                        if (norm1 === norm2) {
                            trajOverallMatch++;
                            matchingOverallSteps++;
                            matchingCoordinatorThinkingSteps++;
                            trajCoordMatch++;
                        }
                    }
                }
                else if (step.type === 'final_answer') {
                    const l1 = step.annotations.arun ? step.annotations.arun.label : null;
                    const l2 = step.annotations.chenyi ? step.annotations.chenyi.label : null;

                    if (isAnnotated(l1) && isAnnotated(l2)) {
                        const norm1 = normalizeLabel(l1);
                        const norm2 = normalizeLabel(l2);

                        trajOverallTotal++;
                        totalOverallSteps++;
                        totalFinalAnswerSteps++;
                        trajCoordTotal++;

                        if (norm1 === norm2) {
                            trajOverallMatch++;
                            matchingOverallSteps++;
                            matchingFinalAnswerSteps++;
                            trajCoordMatch++;
                        }
                    }
                }
                else if (step.type === 'expert_call') {
                    const l1 = step.annotations.arun ? step.annotations.arun.label : null;
                    const l2 = step.annotations.chenyi ? step.annotations.chenyi.label : null;

                    if (isAnnotated(l1) && isAnnotated(l2)) {
                        const norm1 = normalizeLabel(l1);
                        const norm2 = normalizeLabel(l2);

                        trajOverallTotal++;
                        totalOverallSteps++;
                        trajCoordTotal++;

                        if (norm1 === norm2) {
                            trajOverallMatch++;
                            matchingOverallSteps++;
                            trajCoordMatch++;
                        }
                    }
                }
                // 2. Expert response (Cycles)
                else if (step.type === 'expert_response') {
                    step.cycles.forEach(cycle => {
                        const l1 = cycle.annotations.arun ? cycle.annotations.arun.label : null;
                        // Compare Arun's cycle-level annotation to Chenyi's cycle or action annotation
                        let l2 = null;
                        if (cycle.annotations.chenyi) {
                            l2 = cycle.annotations.chenyi.label;
                        } else if (cycle.annotations.chenyi_action) {
                            l2 = cycle.annotations.chenyi_action.label;
                        }

                        if (isAnnotated(l1) && isAnnotated(l2)) {
                            const norm1 = normalizeLabel(l1);
                            const norm2 = normalizeLabel(l2);

                            trajOverallTotal++;
                            totalOverallSteps++;
                            totalExpertResponseSteps++;

                            if (norm1 === norm2) {
                                trajOverallMatch++;
                                matchingOverallSteps++;
                                matchingExpertResponseSteps++;
                            }
                        }
                    });
                }
            });

            const overallRate = trajOverallTotal > 0 ? (trajOverallMatch / trajOverallTotal * 100) : null;
            const coordRate = trajCoordTotal > 0 ? (trajCoordMatch / trajCoordTotal * 100) : null;

            processedTrajectories.push({
                ...traj,
                overallRate,
                coordRate,
                overallTotal: trajOverallTotal,
                coordTotal: trajCoordTotal
            });
        });

        // Update overall stats dashboard
        const globalOverall = totalOverallSteps > 0 ? (matchingOverallSteps / totalOverallSteps * 100).toFixed(1) : "0.0";
        overallAgreementEl.textContent = `${globalOverall}%`;

        const globalCoordinator = totalCoordinatorThinkingSteps > 0 ? (matchingCoordinatorThinkingSteps / totalCoordinatorThinkingSteps * 100).toFixed(1) : "N/A";
        coordinatorAgreementEl.textContent = globalCoordinator !== "N/A" ? `${globalCoordinator}%` : "N/A";

        const globalExpert = totalExpertResponseSteps > 0 ? (matchingExpertResponseSteps / totalExpertResponseSteps * 100).toFixed(1) : "N/A";
        expertAgreementEl.textContent = globalExpert !== "N/A" ? `${globalExpert}%` : "N/A";

        const globalFinalAnswer = totalFinalAnswerSteps > 0 ? (matchingFinalAnswerSteps / totalFinalAnswerSteps * 100).toFixed(1) : "N/A";
        finalAnswerAgreementEl.textContent = globalFinalAnswer !== "N/A" ? `${globalFinalAnswer}%` : "N/A";

        comparableCountEl.textContent = processedTrajectories.length;
        unannotatedCountEl.textContent = `${allTrajectories.length} trajectories total`;

        // Render each trajectory
        processedTrajectories.forEach(traj => {
            renderTrajectory(traj);
        });

        // Set up search and filters
        searchInput.addEventListener('input', applyFiltersAndSearch);
        filterDisagreementsBtn.addEventListener('click', () => {
            filterOnlyDisagreements = !filterOnlyDisagreements;
            filterDisagreementsBtn.classList.toggle('active', filterOnlyDisagreements);
            applyFiltersAndSearch();
        });
    }

    function applyFiltersAndSearch() {
        const query = searchInput.value.toLowerCase();
        const cards = trajectoriesContainer.querySelectorAll('.trajectory-card');

        cards.forEach(card => {
            const trajIdx = card.dataset.idx;
            const traj = allTrajectories.find(t => t.traj_idx.toString() === trajIdx);
            if (!traj) return;

            const matchesSearch = traj.question.toLowerCase().includes(query) || traj.traj_idx.toString().includes(query);
            
            // Check if there is any disagreement (overall agreement or coordinator agreement < 100)
            const overallRate = parseFloat(card.dataset.overallRate);
            const coordRate = parseFloat(card.dataset.coordRate);
            
            const hasDisagreement = (isNaN(overallRate) || overallRate < 100) || (isNaN(coordRate) || coordRate < 100);

            const showCard = matchesSearch && (!filterOnlyDisagreements || hasDisagreement);
            
            if (showCard) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    function renderTrajectory(traj) {
        const clone = trajectoryTemplate.content.cloneNode(true);
        const card = clone.querySelector('.trajectory-card');
        const header = clone.querySelector('.trajectory-header');
        const content = clone.querySelector('.trajectory-content');
        
        card.dataset.idx = traj.traj_idx;
        card.dataset.overallRate = traj.overallRate !== null ? traj.overallRate : "NaN";
        card.dataset.coordRate = traj.coordRate !== null ? traj.coordRate : "NaN";

        clone.querySelector('.traj-id').textContent = `Trajectory ${traj.traj_idx} (${traj.data_source})`;
        clone.querySelector('.traj-question').textContent = traj.question;

        // Set badges
        const overallBadge = clone.querySelector('.badge-overall');
        if (traj.overallRate === null) {
            overallBadge.textContent = "No Aligned Cycles";
            overallBadge.className = "traj-agreement-badge badge-overall badge-medium";
        } else {
            overallBadge.textContent = `Overall: ${traj.overallRate.toFixed(0)}% Match`;
            if (traj.overallRate === 100) overallBadge.className = "traj-agreement-badge badge-overall badge-high";
            else if (traj.overallRate >= 70) overallBadge.className = "traj-agreement-badge badge-overall badge-medium";
            else overallBadge.className = "traj-agreement-badge badge-overall badge-low";
        }

        // Expand/Collapse Trajectory Card
        header.addEventListener('click', () => {
            card.classList.toggle('expanded');
            content.classList.toggle('hidden');
        });

        const stepsContainer = clone.querySelector('.steps-container');
        
        // Render Steps chronologically
        traj.original_steps.forEach(step => {
            const stepEl = document.createElement('div');
            
            if (step.type === 'coordinator_thinking') {
                stepEl.className = 'original-trace-step coordinator-step';
                
                const isMatch = checkStepMatch(step.annotations.arun, step.annotations.chenyi);
                const borderClass = isMatch === null ? '' : (isMatch ? 'annot-match' : 'annot-mismatch');
                
                stepEl.innerHTML = `
                    <div class="step-card">
                        <div class="step-card-header">
                            <span class="step-card-title">Coordinator Thinking (Round ${step.round})</span>
                        </div>
                        <div class="step-card-body">
                            <div class="original-text-content mono-text">${escapeHtml(step.content)}</div>
                            <div class="annotations-comparison-grid">
                                ${renderAnnotationBox("Arun", step.annotations.arun, borderClass)}
                                ${renderAnnotationBox("Chenyi", step.annotations.chenyi, borderClass)}
                            </div>
                        </div>
                    </div>
                `;
            } 
            else if (step.type === 'expert_call') {
                stepEl.className = 'original-trace-step expert-call-step';
                
                const isMatch = checkStepMatch(step.annotations.arun, step.annotations.chenyi);
                const borderClass = isMatch === null ? '' : (isMatch ? 'annot-match' : 'annot-mismatch');
                
                stepEl.innerHTML = `
                    <div class="step-card">
                        <div class="step-card-header">
                            <span class="step-card-title">Expert Call (ci${step.call_index})</span>
                        </div>
                        <div class="step-card-body">
                            <div class="expert-call-meta">
                                Call Index: <span>ci${step.call_index}</span> | Expert ID: <span>${step.expert_id}</span> | Round: <span>${step.round}</span>
                            </div>
                            <div class="original-text-content mono-text">Sub-question: "${escapeHtml(step.sub_question)}"</div>
                            <div class="annotations-comparison-grid">
                                ${renderAnnotationBox("Arun (Not separately annotated)", step.annotations.arun, borderClass)}
                                ${renderAnnotationBox("Chenyi", step.annotations.chenyi, borderClass)}
                            </div>
                        </div>
                    </div>
                `;
            } 
            else if (step.type === 'expert_response') {
                stepEl.className = 'original-trace-step expert-response-step';
                
                // Construct cycles HTML
                let cyclesHtml = '';
                step.cycles.forEach(cycle => {
                    const hasThink = !!cycle.think;
                    const hasSearch = !!cycle.search;
                    const hasInfo = !!cycle.information;

                    const arunLabel = cycle.annotations.arun ? cycle.annotations.arun.label : 'none';
                    let chenyiLabel = 'none';
                    if (cycle.annotations.chenyi) {
                        chenyiLabel = cycle.annotations.chenyi.label;
                    } else if (cycle.annotations.chenyi_action) {
                        chenyiLabel = cycle.annotations.chenyi_action.label;
                    }
                    
                    const chenyiAnnot = cycle.annotations.chenyi || cycle.annotations.chenyi_action;
                    const isMatch = checkStepMatch(cycle.annotations.arun, chenyiAnnot);
                    const borderClass = isMatch === null ? '' : (isMatch ? 'annot-match' : 'annot-mismatch');

                    cyclesHtml += `
                        <div class="expert-cycle-card">
                            <div class="expert-cycle-header">
                                <span class="cycle-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    Cycle ${cycle.cycle_idx}
                                </span>
                                <div class="cycle-annotations-summary">
                                    <span class="annot-summary-label">Arun:</span>
                                    <span class="label-pill ${getLabelClass(arunLabel)}">${arunLabel}</span>
                                    <span class="annot-summary-label">Chenyi:</span>
                                    <span class="label-pill ${getLabelClass(chenyiLabel)}">${chenyiLabel}</span>
                                </div>
                            </div>
                            <div class="expert-cycle-body">
                                ${hasThink ? `
                                    <div class="parsed-block">
                                        <span class="parsed-block-title think-title">Thought</span>
                                        <div class="parsed-block-content mono-text">${escapeHtml(cycle.think)}</div>
                                    </div>
                                ` : ''}
                                ${hasSearch ? `
                                    <div class="parsed-block">
                                        <span class="parsed-block-title search-title">Search Query</span>
                                        <div class="parsed-block-content mono-text">${escapeHtml(cycle.search)}</div>
                                    </div>
                                ` : ''}
                                ${hasInfo ? `
                                    <div class="parsed-block">
                                        <span class="parsed-block-title info-title">Search Results Documents</span>
                                        <div class="parsed-block-content mono-text" style="max-height: 250px; overflow-y: auto;">${escapeHtml(cycle.information)}</div>
                                    </div>
                                ` : ''}
                                
                                <div class="annotations-comparison-grid">
                                    ${renderAnnotationBox("Arun (Cycle)", cycle.annotations.arun, borderClass)}
                                    ${cycle.annotations.chenyi ? 
                                        renderAnnotationBox("Chenyi (Cycle)", cycle.annotations.chenyi, borderClass) :
                                        `<div class="annotation-box ${borderClass}">
                                            <div class="annot-author">Chenyi (Detailed Sub-steps)</div>
                                            <div class="step-annotation-sub">
                                                <div style="font-weight: 500; margin-bottom: 0.25rem;">1. Think step:</div>
                                                ${renderCycleSubStep(cycle.annotations.chenyi_think)}
                                            </div>
                                            <div class="step-annotation-sub" style="margin-top: 0.75rem; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
                                                <div style="font-weight: 500; margin-bottom: 0.25rem;">2. Action step:</div>
                                                ${renderCycleSubStep(cycle.annotations.chenyi_action)}
                                            </div>
                                        </div>`
                                    }
                                </div>
                            </div>
                        </div>
                    `;
                });

                stepEl.innerHTML = `
                    <div class="step-card">
                        <div class="step-card-header" style="background: rgba(16, 185, 129, 0.03);">
                            <span class="step-card-title">Expert Response (ci${step.call_index} - Expert ${step.expert_id} - Round ${step.round})</span>
                            <span class="traj-agreement-badge ${step.success ? 'badge-high' : 'badge-low'}">
                                ${step.success ? 'Success' : 'Failed'}
                            </span>
                        </div>
                        <div class="step-card-body" style="padding: 1rem;">
                            <div class="expert-cycles-list">
                                ${cyclesHtml}
                            </div>
                        </div>
                    </div>
                `;
            } 
            else if (step.type === 'final_answer') {
                stepEl.className = 'original-trace-step final-answer-step';
                
                const isMatch = checkStepMatch(step.annotations.arun, step.annotations.chenyi);
                const borderClass = isMatch === null ? '' : (isMatch ? 'annot-match' : 'annot-mismatch');
                
                stepEl.innerHTML = `
                    <div class="step-card">
                        <div class="step-card-header">
                            <span class="step-card-title">Final Answer</span>
                        </div>
                        <div class="step-card-body">
                            <div class="original-text-content mono-text">${escapeHtml(step.content)}</div>
                            <div class="annotations-comparison-grid">
                                ${renderAnnotationBox("Arun", step.annotations.arun, borderClass)}
                                ${renderAnnotationBox("Chenyi", step.annotations.chenyi, borderClass)}
                            </div>
                        </div>
                    </div>
                `;
            }

            stepsContainer.appendChild(stepEl);
        });

        // Bind toggle clicks to cycle cards
        const cycleCards = content.querySelectorAll('.expert-cycle-card');
        cycleCards.forEach(cCard => {
            const cycleHeader = cCard.querySelector('.expert-cycle-header');
            cycleHeader.addEventListener('click', (e) => {
                // Prevent toggle from firing if clicking inside badges
                if (e.target.closest('.label-pill')) return;
                cCard.classList.toggle('expanded');
            });
        });

        trajectoriesContainer.appendChild(card);
    }

    function checkStepMatch(annot1, annot2) {
        if (!annot1 || !annot2) return null;
        const l1 = annot1.label;
        const l2 = annot2.label;
        if (!isAnnotated(l1) || !isAnnotated(l2)) return null;
        return normalizeLabel(l1) === normalizeLabel(l2);
    }

    function renderAnnotationBox(authorName, annot, borderClass) {
        if (!annot || !isAnnotated(annot.label)) {
            return `
                <div class="annotation-box">
                    <div class="annot-author">${authorName}</div>
                    <div class="annot-empty">Unannotated / None</div>
                </div>
            `;
        }

        const isCrit = normalizeLabel(annot.label) === 'critical';
        const critTypeHtml = isCrit && annot.critical_type ? `
            <span class="critical-type-pill">${escapeHtml(annot.critical_type)}</span>
        ` : '';

        return `
            <div class="annotation-box ${borderClass}">
                <div class="annot-author">${authorName}</div>
                <div class="annot-pill-row">
                    <span class="label-pill ${getLabelClass(annot.label)}">${annot.label}</span>
                    ${critTypeHtml}
                </div>
                <div class="annot-reason">${escapeHtml(annot.reason || 'No reason provided')}</div>
                ${annot.note ? `<div class="annot-note">Note: ${escapeHtml(annot.note)}</div>` : ''}
            </div>
        `;
    }

    function renderCycleSubStep(annot) {
        if (!annot || !isAnnotated(annot.label)) {
            return `<div class="annot-empty">Unannotated</div>`;
        }

        const isCrit = normalizeLabel(annot.label) === 'critical';
        const critTypeHtml = isCrit && annot.critical_type ? `
            <span class="critical-type-pill" style="margin-left: 0.5rem;">${escapeHtml(annot.critical_type)}</span>
        ` : '';

        return `
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem;">
                    <span class="label-pill ${getLabelClass(annot.label)}" style="transform: scale(0.9); transform-origin: left;">${annot.label}</span>
                    ${critTypeHtml}
                </div>
                <div class="annot-reason" style="font-size: 0.8rem; margin-top: 0.15rem;">${escapeHtml(annot.reason || 'No reason provided')}</div>
                ${annot.note ? `<div class="annot-note" style="font-size: 0.7rem; padding: 0.2rem 0.4rem;">Note: ${escapeHtml(annot.note)}</div>` : ''}
            </div>
        `;
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
