/* ── ChatToKanban — App Logic ─────────────────────────────────────────────── */

const STATE = { tasks: [], announcements: [], summary: "", fluffCount: 0, stats: {} };

/* ── Init ──────────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    setupUploadZone();
    setupTabs();
    document.getElementById("analyzeBtn").addEventListener("click", runAnalysis);
    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modalOverlay").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.getElementById("modalSave").addEventListener("click", saveModalEdit);
    document.getElementById("addTaskBtn").addEventListener("click", addManualTask);
});

/* ── Upload Zone ───────────────────────────────────────────────────────────── */
function setupUploadZone() {
    const zone = document.getElementById("uploadZone");
    const input = document.getElementById("fileInput");
    const label = document.getElementById("fileName");

    zone.addEventListener("click", () => input.click());
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
            input.files = e.dataTransfer.files;
            label.textContent = e.dataTransfer.files[0].name;
        }
    });
    input.addEventListener("change", () => {
        if (input.files.length) label.textContent = input.files[0].name;
    });
}

/* ── Tabs ──────────────────────────────────────────────────────────────────── */
function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });
}

/* ── Analysis ──────────────────────────────────────────────────────────────── */
async function runAnalysis() {
    const fileInput = document.getElementById("fileInput");
    const dateRange = document.getElementById("dateRange").value;
    const btn = document.getElementById("analyzeBtn");

    if (!fileInput.files.length) {
        showError("Please select a WhatsApp .txt export file.");
        return;
    }

    btn.disabled = true;
    showSpinner(true);
    hideError();

    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("date_range", dateRange);

    try {
        const res = await fetch("/api/analyze", { method: "POST", body: form });
        const data = await res.json();

        if (data.error) {
            showError(data.error);
            return;
        }

        STATE.tasks = data.tasks || [];
        STATE.announcements = data.announcements || [];
        STATE.summary = data.summary || "";
        STATE.fluffCount = data.fluff_count || 0;
        STATE.stats = data.stats || {};

        renderMetrics();
        renderKanban();
        renderAnnouncements();
        renderCharts();
        renderSummary();
        showResults();
    } catch (err) {
        showError("Network error: " + err.message);
    } finally {
        btn.disabled = false;
        showSpinner(false);
    }
}

/* ── Render Metrics ────────────────────────────────────────────────────────── */
function renderMetrics() {
    const total = STATE.tasks.length + STATE.fluffCount;
    document.getElementById("metricTotal").textContent = total;
    document.getElementById("metricTasks").textContent = STATE.tasks.length;
    document.getElementById("metricAnnounce").textContent = STATE.announcements.length;
    document.getElementById("metricFluff").textContent = STATE.fluffCount;
}

/* ── Kanban Board ──────────────────────────────────────────────────────────── */
function renderKanban() {
    ["todo", "wip", "done"].forEach((col) => {
        document.getElementById(col + "List").innerHTML = "";
    });

    const counts = { todo: 0, wip: 0, done: 0 };

    STATE.tasks.forEach((task, idx) => {
        const col = statusToCol(task.status);
        counts[col]++;
        const card = createTaskCard(task, idx);
        document.getElementById(col + "List").appendChild(card);
    });

    document.getElementById("todoCount").textContent = counts.todo;
    document.getElementById("wipCount").textContent = counts.wip;
    document.getElementById("doneCount").textContent = counts.done;

    initSortable();
}

function statusToCol(s) {
    if (s === "In Progress") return "wip";
    if (s === "Done") return "done";
    return "todo";
}

function colToStatus(c) {
    if (c === "wip") return "In Progress";
    if (c === "done") return "Done";
    return "To Do";
}

function createTaskCard(task, idx) {
    const div = document.createElement("div");
    div.className = "task-card";
    div.dataset.index = idx;

    const priorityCls = { High: "priority-high", Medium: "priority-medium", Low: "priority-low" }[task.priority] || "";
    const deadlineDate = parseSafeDate(task.deadline);
    const isOverdue = deadlineDate && deadlineDate < new Date();
    const overdueHtml = isOverdue ? '<span class="overdue-badge">OVERDUE</span>' : "";

    div.innerHTML = `
        <div class="task-title">${esc(task.title)}</div>
        <div class="task-meta">
            <span>👤 ${esc(task.assignee)}</span>
            <span>⏰ ${esc(task.deadline)}${overdueHtml}</span>
            <span class="${priorityCls}">${priorityEmoji(task.priority)} ${esc(task.priority)}</span>
        </div>
        <div class="task-actions" data-idx="${idx}">
            ${actionButtons(task.status, idx)}
        </div>
    `;

    div.querySelectorAll(".task-actions button").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const newStatus = btn.dataset.status;
            if (newStatus === "__edit__") {
                openModal(idx);
            } else {
                moveTask(idx, newStatus);
            }
        });
    });

    return div;
}

function actionButtons(status, idx) {
    let html = "";
    if (status === "To Do") {
        html += `<button data-status="In Progress">➡️ In Progress</button>`;
        html += `<button data-status="Done">✅ Done</button>`;
    } else if (status === "In Progress") {
        html += `<button data-status="To Do">⬅️ To Do</button>`;
        html += `<button data-status="Done">✅ Done</button>`;
    } else {
        html += `<button data-status="To Do">↩️ Reopen</button>`;
    }
    html += `<button data-status="__edit__">✏️ Edit</button>`;
    return html;
}

function moveTask(idx, newStatus) {
    STATE.tasks[idx].status = newStatus;
    renderKanban();
}

/* ── Sortable.js Drag & Drop ──────────────────────────────────────────────── */
function initSortable() {
    ["todoList", "wipList", "doneList"].forEach((id) => {
        new Sortable(document.getElementById(id), {
            group: "kanban",
            animation: 180,
            ghostClass: "sortable-ghost",
            chosenClass: "sortable-chosen",
            onEnd: (evt) => {
                const idx = parseInt(evt.item.dataset.index);
                const newCol = evt.to.id.replace("List", "");
                STATE.tasks[idx].status = colToStatus(newCol);
                renderKanban();
            },
        });
    });
}

/* ── Announcements ─────────────────────────────────────────────────────────── */
function renderAnnouncements() {
    const container = document.getElementById("announceList");
    container.innerHTML = "";
    if (!STATE.announcements.length) {
        container.innerHTML = '<p style="color:#A0AEC0;font-size:0.9rem;">No announcements found.</p>';
        return;
    }
    STATE.announcements.forEach((a) => {
        const card = document.createElement("div");
        card.className = "announce-card";
        card.innerHTML = `
            <div class="announce-title">${esc(a.title)}</div>
            <div class="announce-meta">Posted by <strong>${esc(a.posted_by)}</strong> · ${esc(a.timestamp)}</div>
            <div class="announce-details">${esc(a.details)}</div>
        `;
        container.appendChild(card);
    });
}

/* ── Charts (Chart.js) ────────────────────────────────────────────────────── */
function renderCharts() {
    renderAssigneeChart();
    renderRatioChart();
}

function renderAssigneeChart() {
    const ctx = document.getElementById("assigneeChart");
    if (!ctx) return;
    if (ctx._chart) ctx._chart.destroy();

    const counts = {};
    STATE.tasks.forEach((t) => { counts[t.assignee] = (counts[t.assignee] || 0) + 1; });
    const labels = Object.keys(counts);
    const values = Object.values(counts);

    ctx._chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Tasks",
                data: values,
                backgroundColor: "#FF5500",
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: "#333333" }, grid: { color: "#E5E7EB" } },
                y: { ticks: { color: "#333333", stepSize: 1 }, grid: { color: "#E5E7EB" } },
            },
        },
    });
}

function renderRatioChart() {
    const ctx = document.getElementById("ratioChart");
    if (!ctx) return;
    if (ctx._chart) ctx._chart.destroy();

    ctx._chart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Actionable Tasks", "Noise / Fluff"],
            datasets: [{
                data: [STATE.tasks.length, STATE.fluffCount],
                backgroundColor: ["#FF5500", "#E5E7EB"],
                borderWidth: 0,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#333333" } } },
        },
    });
}

/* ── Summary ───────────────────────────────────────────────────────────────── */
function renderSummary() {
    document.getElementById("summaryText").textContent = STATE.summary;
}

/* ── Exports ───────────────────────────────────────────────────────────────── */
function escCsv(val) {
    const s = String(val == null ? "" : val);
    return '"' + s.replace(/"/g, '""') + '"';
}

function exportCSV() {
    const BOM = "\uFEFF";
    const lines = [];
    lines.push("ACTIONABLE TASKS");
    lines.push("Status,Title,Assignee,Deadline,Priority");
    STATE.tasks.forEach((t) => {
        lines.push([escCsv(t.status), escCsv(t.title), escCsv(t.assignee), escCsv(t.deadline), escCsv(t.priority)].join(","));
    });
    lines.push("");
    lines.push("ANNOUNCEMENTS");
    lines.push("Title,Author,Text");
    STATE.announcements.forEach((a) => {
        lines.push([escCsv(a.title), escCsv(a.posted_by), escCsv(a.details)].join(","));
    });
    download("ChatToKanban_Export.csv", BOM + lines.join("\n"), "text/csv;charset=utf-8");
}

function exportJSON() {
    const data = {
        export_timestamp: new Date().toISOString(),
        summary: STATE.summary,
        metrics: {
            total_messages: STATE.tasks.length + STATE.fluffCount,
            actionable_tasks: STATE.tasks.length,
            announcements: STATE.announcements.length,
            noise: STATE.fluffCount,
        },
        tasks: STATE.tasks.map((t, i) => ({ id: i + 1, ...t })),
        announcements: STATE.announcements.map((a) => ({
            title: a.title,
            author: a.posted_by,
            text: a.details,
        })),
    };
    download("ChatToKanban_Export.json", JSON.stringify(data, null, 2), "application/json");
}

function exportMarkdown() {
    const md = [];
    md.push("# ChatToKanban Project Export\n");

    md.push("## Executive Summary\n");
    md.push("> " + (STATE.summary || "No summary available.") + "\n");

    md.push("---\n");

    const groups = { "To Do": [], "In Progress": [], "Done": [] };
    STATE.tasks.forEach((t) => {
        const key = t.status;
        if (groups[key]) groups[key].push(t);
    });

    md.push("## Tasks\n");
    for (const [status, tasks] of Object.entries(groups)) {
        md.push("### " + status + " (" + tasks.length + ")\n");
        if (!tasks.length) {
            md.push("_No tasks in this category._\n");
        } else {
            md.push("| Title | Assignee | Deadline | Priority |");
            md.push("|-------|----------|----------|----------|");
            tasks.forEach((t) => {
                md.push("| " + t.title + " | " + t.assignee + " | " + t.deadline + " | " + t.priority + " |");
            });
            md.push("");
        }
    }

    md.push("---\n");
    md.push("## Official Announcements\n");
    if (STATE.announcements.length) {
        STATE.announcements.forEach((a) => {
            md.push("> **" + a.title + "**");
            md.push("> _Posted by " + a.posted_by + "_\n");
            md.push("> " + a.details + "\n");
            md.push("");
        });
    } else {
        md.push("_No announcements recorded._\n");
    }

    download("ChatToKanban_Export.md", md.join("\n"), "text/markdown");
}

function download(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

/* ── Modal ─────────────────────────────────────────────────────────────────── */
let editingIdx = null;

function openModal(idx) {
    editingIdx = idx;
    const task = STATE.tasks[idx];
    document.getElementById("modalTitle").value = task.title;
    document.getElementById("modalAssignee").value = task.assignee;
    document.getElementById("modalDeadline").value = task.deadline;
    document.getElementById("modalPriority").value = task.priority;
    document.getElementById("modalStatus").value = task.status;
    document.getElementById("modalOverlay").classList.add("active");
}

function closeModal() {
    document.getElementById("modalOverlay").classList.remove("active");
    editingIdx = null;
}

function saveModalEdit() {
    if (editingIdx === null) return;
    STATE.tasks[editingIdx].title = document.getElementById("modalTitle").value;
    STATE.tasks[editingIdx].assignee = document.getElementById("modalAssignee").value;
    STATE.tasks[editingIdx].deadline = document.getElementById("modalDeadline").value;
    STATE.tasks[editingIdx].priority = document.getElementById("modalPriority").value;
    STATE.tasks[editingIdx].status = document.getElementById("modalStatus").value;
    closeModal();
    renderKanban();
}

/* ── Add Manual Task ───────────────────────────────────────────────────────── */
function addManualTask() {
    const title = document.getElementById("newTaskTitle").value.trim();
    if (!title) return;
    STATE.tasks.push({
        title,
        assignee: document.getElementById("newTaskAssignee").value.trim() || "Unassigned",
        deadline: document.getElementById("newTaskDeadline").value.trim() || "Not specified",
        priority: document.getElementById("newTaskPriority").value,
        status: "To Do",
    });
    document.getElementById("newTaskTitle").value = "";
    document.getElementById("newTaskAssignee").value = "";
    document.getElementById("newTaskDeadline").value = "";
    renderKanban();
    renderMetrics();
    renderCharts();
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function parseSafeDate(val) {
    if (!val || val === "Not specified") return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

function priorityEmoji(p) {
    return { High: "🔴", Medium: "🟡", Low: "🟢" }[p] || "⚪";
}

function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
}

function showSpinner(on) {
    document.getElementById("spinner").style.display = on ? "flex" : "none";
}

function showError(msg) {
    const el = document.getElementById("errorBanner");
    el.textContent = msg;
    el.style.display = "block";
}

function hideError() {
    document.getElementById("errorBanner").style.display = "none";
}

function showResults() {
    document.getElementById("resultsSection").style.display = "block";
}
