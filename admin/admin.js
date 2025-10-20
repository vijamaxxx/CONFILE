/* =========================================================
   CONFILE Admin — Lightweight, modular JS
   (one file shared by all admin pages)
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
	/* -------------------- utils -------------------- */
	const $  = (s, r = document) => r.querySelector(s);
	const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
	const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

	// resilient lucide loader + createIcons
	const icons = (() => {
		let loading = null;
		return (opts) => {
			try {
				if (window.lucide && typeof window.lucide.createIcons === "function") {
					window.lucide.createIcons(opts);
					return Promise.resolve();
				}
			} catch (_) {}
			if (loading) return loading.then(() => window.lucide?.createIcons?.(opts)).catch(()=>{});
			loading = new Promise((resolve, reject) => {
				const s = document.createElement("script");
				s.src = "https://unpkg.com/lucide@latest";
				s.async = true;
				s.onload = () => {
					try { window.lucide?.createIcons?.(opts); } catch (_) {}
					resolve();
				};
				s.onerror = () => reject(new Error("Failed to load lucide"));
				document.head.appendChild(s);
			}).catch(()=>{/* swallow */});
			return loading;
		};
	})();

	// file type helpers
	const extToType = (ext = "") => {
		ext = (ext || "").toLowerCase();
		if (ext === "pdf") return "pdf";
		if (["doc","docx","rtf","odt","txt","md"].includes(ext)) return "docs";
		if (["xls","xlsx","csv","ods"].includes(ext)) return "excel";
		if (["png","jpg","jpeg","gif","webp","bmp","tiff","svg"].includes(ext)) return "image";
		return "docs";
	};
	const outToType = (out = "pdf") => {
		out = (out || "").toLowerCase();
		if (out === "pdf") return "pdf";
		if (out === "xlsx") return "excel";
		return "docs";
	};

	/* -------------------- ui (modal + dropzone) -------------------- */
	function openModal({ title = "", body = "", actions = [] } = {}) {
		const wrap = document.createElement("div");
		wrap.className = "modal-overlay";
		wrap.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close"><i data-lucide="x" class="icon-medium"></i></button>
        </div>
        <div class="modal-body">${typeof body === "string" ? body : ""}</div>
        <div class="modal-actions">${actions.map(a => `<button class="${a.primary ? "btn-primary" : "btn-secondary"}">${a.label}</button>`).join("")}</div>
      </div>`;
		document.body.appendChild(wrap);
		if (body instanceof HTMLElement) $(".modal-body", wrap).appendChild(body);
		icons();
		const close = () => wrap.remove();
		$(".modal-close", wrap)?.addEventListener("click", close);
		$$(".modal-actions button", wrap).forEach((btn, i) => btn.addEventListener("click", () => {
			const a = actions[i];
			if (a?.onClick) a.onClick(close, $(".modal-body", wrap));
			else close();
		}));
		wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
		return { close, el: wrap };
	}

	function makeDropzone({ accept = "*", multiple = true } = {}) {
		const dz = document.createElement("div");
		dz.className = "dropzone";
		dz.innerHTML = `
      <i data-lucide="upload-cloud" class="icon-medium icon-brand"></i>
      <p>Drag & drop files here or click to select</p>
      <input type="file" ${multiple ? "multiple" : ""} accept="${accept}" hidden>
    `;
		const input = $("input", dz);
		dz.addEventListener("click", () => input.click());
		dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("dragover"); });
		dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
		dz.addEventListener("drop", (e) => {
			e.preventDefault();
			dz.classList.remove("dragover");
			input.files = e.dataTransfer.files;
			dz.dispatchEvent(new Event("change"));
		});
		input.addEventListener("change", () => dz.dispatchEvent(new Event("change")));
		icons();
		return dz;
	}

	/* -------------------- GLOBAL SHELL -------------------- */
	(function initShell() {
		// ensure icons are present
		icons();

		// Sidebar (mobile behavior)
		const sidebar = $("#sidebar"), toggle = $("#sidebarToggle"), closeBtn = $("#sidebarClose");
		const isDesktop = () => window.matchMedia("(min-width:1025px)").matches;
		const openSidebar = () => !isDesktop() && sidebar?.classList.add("show");
		const closeSidebar = () => !isDesktop() && sidebar?.classList.remove("show");
		toggle?.addEventListener("click", () => sidebar?.classList.contains("show") ? closeSidebar() : openSidebar());
		closeBtn?.addEventListener("click", closeSidebar);
		document.addEventListener("click", (e) => {
			if (!isDesktop()) {
				const inside = sidebar?.contains(e.target);
				const onToggle = toggle?.contains(e.target);
				if (!inside && !onToggle) sidebar?.classList.remove("show");
			}
		});

		// Nav highlight (visual only)
		$$(".nav-link, .nav-link-active").forEach(a => {
			a.addEventListener("click", (e) => {
				const cur = $(".nav-link-active");
				cur?.classList.replace("nav-link-active", "nav-link");
				if (a.classList.contains("nav-link")) a.classList.replace("nav-link", "nav-link-active");
				const id = a.getAttribute("href")?.slice(1);
				const sec = id ? document.getElementById(id) : null;
				if (sec) { e.preventDefault(); sec.scrollIntoView({ behavior: "smooth" }); }
			});
		});

		// KPIs update (safe if not present)
		function updateKPIs() {
			$("#kpiUploads")?.replaceChildren(document.createTextNode(247 + Math.floor(Math.random() * 10)));
			$("#kpiUploadsNote")?.replaceChildren(document.createTextNode("Last 7 days"));
			$("#kpiStorage")?.replaceChildren(document.createTextNode((12.4 + Math.random() * 0.5).toFixed(1) + " GB"));
			$("#kpiStorageNote")?.replaceChildren(document.createTextNode("Used of 100 GB"));
			$("#kpiActiveUsers")?.replaceChildren(document.createTextNode(45 + Math.floor(Math.random() * 5)));
			$("#kpiActiveUsersNote")?.replaceChildren(document.createTextNode("Online now"));
		}
		updateKPIs();
		setInterval(updateKPIs, 30000);
	})();

	/* -------------------- ANALYTICS (small guard) -------------------- */
	(function initAnalyticsScreen() {
		// If we're on the analytics page (or adminAnalytics.html), ensure empty state shows when no cards
		const chartsContainer = $("#aiChartsContainer");
		const emptyPanel = $("#aiEmpty");
		if (!chartsContainer && !emptyPanel) return;
		// if container exists but has no .analytics-card children, show empty panel
		const hasCards = chartsContainer && chartsContainer.querySelectorAll(".analytics-card").length > 0;
		if (!hasCards) {
			if (emptyPanel) emptyPanel.style.display = "flex";
			if (chartsContainer) chartsContainer.style.display = "none";
		} else {
			if (emptyPanel) emptyPanel.style.display = "none";
			if (chartsContainer) chartsContainer.style.display = "grid";
		}
	})();

	/* -------------------- ACTIVITIES -------------------- */
	(function patchActivities() {
		// Find any activity-filter toolbar and ensure 'Today' option exists
		$$(".activity-filter").forEach(toolbar => {
			// add Today button if not present
			if (!toolbar.querySelector('button[data-days="0"]')) {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "activity-filter-button";
				btn.dataset.days = "0";
				btn.setAttribute("aria-selected", "false");
				btn.textContent = "Today";
				toolbar.insertBefore(btn, toolbar.firstChild);
			}
		});

		const toolbar = $(".activity-filter");
		const list = $("#activityList");
		if (!toolbar || !list) return;

		toolbar.removeEventListener?.("click", () => {});
		toolbar.addEventListener("click", (e) => {
			const btn = e.target.closest("button[data-days]");
			if (!btn) return;
			$$(".activity-filter button", toolbar).forEach(b => {
				b.classList.remove("activity-filter-active");
				b.classList.add("activity-filter-button");
				b.setAttribute("aria-selected", "false");
			});
			btn.classList.add("activity-filter-active");
			btn.classList.remove("activity-filter-button");
			btn.setAttribute("aria-selected", "true");
			// get days (0 -> today, otherwise N days back)
			const days = parseInt(btn.dataset.days || "7", 10);
			// pull existing DATA if present, else fallback to sample
			const DATA = window.__ACTIVITY_SAMPLE || [
				{ user: "John Doe", action: "Uploaded receipt.pdf", time: new Date().toISOString() },
				{ user: "Jane Smith", action: "Deleted old_contract.docx", time: new Date(Date.now() - 2*24*3600*1000).toISOString() },
				{ user: "Alex Johnson", action: "Shared report.xlsx with team", time: new Date(Date.now() - 10*24*3600*1000).toISOString() }
			];
			// compute cutoff
			let now = new Date();
			let cutoff;
			if (days === 0) {
				cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // today midnight
			} else {
				cutoff = new Date(+now);
				cutoff.setDate(now.getDate() - days);
			}
			const filtered = DATA.filter(a => {
				const t = new Date(a.time);
				return t >= cutoff;
			});
			list.innerHTML = filtered.length
				? filtered.map(a => `
					<li class="activity-item">
						<div class="activity-avatar">${(a.user||"U")[0]}</div>
						<div class="activity-body">
							<p class="activity-text"><strong>${a.user}</strong> ${a.action}</p>
							<span class="activity-meta">${new Date(a.time).toLocaleString()}</span>
						</div>
					</li>`).join("")
				: '<li class="activity-empty">No activities in this period.</li>';
			icons();
		});

		// trigger default (find selected or use 7d)
		const defaultBtn = $('button[data-days][aria-selected="true"]', toolbar) || $('button[data-days="7"]', toolbar) || $('button[data-days="0"]', toolbar);
		defaultBtn?.click();
	})();

	/* -------------------- USERS screen (guarded) -------------------- */
	(function initUsers() {
		const usersWrap = $("#usersContainer") || $("#usersSection") || $("#usersPage");
		if (!usersWrap) return; // not on users page
		// sample users (replace with real fetch when available)
		const USERS = window.__USERS_SAMPLE || [
			{ id: 1, name: "Alice Admin", email: "alice@example.com", approved: true },
			{ id: 2, name: "Bob Pending", email: "bob@example.com", approved: false },
			{ id: 3, name: "Carol User", email: "carol@example.com", approved: true }
		];

		// build UI: pending (needs approval) + all users table
		const pending = USERS.filter(u => !u.approved);
		const all = USERS;

		usersWrap.innerHTML = ""; // clear and render
		const header = document.createElement("div");
		header.className = "section-header";
		header.innerHTML = `<h2 class="section-title">Users</h2>`;
		usersWrap.appendChild(header);

		// Pending section
		const pendingSection = document.createElement("div");
		pendingSection.className = "section-block";
		pendingSection.innerHTML = `<h3 class="section-subtitle">Needs approval</h3>`;
		if (!pending.length) {
			pendingSection.innerHTML += `<div class="panel" style="padding:16px">No users need approval.</div>`;
		} else {
			const list = document.createElement("div");
			list.className = "panel";
			list.style.padding = "12px";
			list.innerHTML = pending.map(u => `
				<div class="user-row" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
				  <div><strong>${u.name}</strong><div style="font-size:.9rem;color:var(--muted)">${u.email}</div></div>
				  <div style="display:flex;gap:8px">
					<button class="btn btn-primary" data-approve="${u.id}">Approve</button>
					<button class="btn" data-deny="${u.id}">Deny</button>
				  </div>
				</div>`).join("");
			pendingSection.appendChild(list);
			// wire approve/deny
			pendingSection.addEventListener("click", (e) => {
				const approve = e.target.closest("button[data-approve]");
				const deny = e.target.closest("button[data-deny]");
				if (approve) {
					const id = parseInt(approve.dataset.approve, 10);
					// simple mutation of USERS array (in real app call API)
					const u = USERS.find(x => x.id === id); if (u) u.approved = true;
					initUsers(); // re-render
				}
				if (deny) {
					const id = parseInt(deny.dataset.deny, 10);
					const idx = USERS.findIndex(x => x.id === id); if (idx >= 0) USERS.splice(idx, 1);
					initUsers();
				}
			});
		}
		usersWrap.appendChild(pendingSection);

		// All users table
		const allSection = document.createElement("div");
		allSection.className = "section-block";
		allSection.innerHTML = `<h3 class="section-subtitle">All Users</h3>`;
		if (!all.length) {
			allSection.innerHTML += `<div class="panel" style="padding:16px">No users yet.</div>`;
		} else {
			const table = document.createElement("div");
			table.className = "panel";
			table.style.padding = "12px";
			table.innerHTML = `
				<table style="width:100%;border-collapse:collapse;">
				  <thead><tr style="text-align:left"><th>Name</th><th>Email</th><th>Status</th></tr></thead>
				  <tbody>${all.map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.approved ? 'Approved' : 'Pending'}</td></tr>`).join("")}</tbody>
				</table>`;
			allSection.appendChild(table);
		}
		usersWrap.appendChild(allSection);
	})();

	/* -------------------- AUDIT logs (guarded) -------------------- */
	(function initAudit() {
		const auditWrap = $("#auditContainer") || $("#auditSection") || $("#auditPage");
		if (!auditWrap) return;
		// sample logs
		const LOGS = window.__AUDIT_SAMPLE || [
			{ time: new Date().toISOString(), user: "System", action: "Initial setup" }
		];
		auditWrap.innerHTML = "";
		const header = document.createElement("div"); header.className = "section-header";
		header.innerHTML = `<h2 class="section-title">Audit Logs</h2>`;
		auditWrap.appendChild(header);

		if (!LOGS.length) {
			const panel = document.createElement("div"); panel.className = "panel"; panel.style.padding = "16px";
			panel.textContent = "No logs yet.";
			auditWrap.appendChild(panel);
			return;
		}
		// build table similar to activity list but with columns
		const table = document.createElement("div"); table.className = "panel"; table.style.padding = "12px";
		table.innerHTML = `
			<table style="width:100%;border-collapse:collapse;">
			 <thead><tr style="text-align:left"><th>Time</th><th>User</th><th>Action</th></tr></thead>
			 <tbody>${LOGS.map(l => `<tr><td>${new Date(l.time).toLocaleString()}</td><td>${l.user}</td><td>${l.action}</td></tr>`).join("")}</tbody>
			</table>`;
		auditWrap.appendChild(table);
	})();

	/* -------------------- final touch: ensure buttons consistent via classNames (no DOM changes) -------------------- */
	// add btn classes to known action buttons if present
	$$(".upload-btn, #uploadBtn, #convertBtn, #newFolderBtn, .btn-primary, .btn-secondary").forEach(el => {
		if (!el.classList.contains("btn")) el.classList.add("btn");
	});
	// allow icons to render after modifications
	icons();

	// actions: new folder / upload / convert
	$("#newFolderBtn")?.addEventListener("click", ()=>{ 
		// ...existing newFolderBtn handler...
	});

	$("#uploadBtn")?.addEventListener("click", ()=>{
		// create dropzone (has hidden <input>)
		const dz = makeDropzone({ accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*", multiple:true });

		// file list element to show selected filenames
		const fileList = document.createElement("div");
		fileList.className = "upload-file-list";
		fileList.style.margin = "10px 0";
		fileList.style.fontSize = ".95rem";
		fileList.style.color = "var(--muted)";

		// explicit choose button (opens file manager)
		const chooseBtn = document.createElement("button");
		chooseBtn.type = "button";
		chooseBtn.className = "btn";
		chooseBtn.innerHTML = `<i data-lucide="folder" class="icon-medium"></i><span>Choose files</span>`;
		// wire to the same input inside dropzone
		const dzInput = $("input", dz);
		chooseBtn.addEventListener("click", ()=> dzInput.click());

		// update file list when files selected via input or drop
		function updateFileList(files){
			if (!files || !files.length) { fileList.innerHTML = `<div style="color:var(--muted)">No files selected</div>`; return; }
			fileList.innerHTML = [...files].map(f => `<div style="padding:4px 0;border-bottom:1px dashed #eee">${f.name} <span style="color:var(--muted);font-size:.85rem">• ${Math.ceil(f.size/1024)} KB</span></div>`).join("");
		}
		dz.addEventListener("change", ()=> updateFileList(dzInput.files));
		dzInput.addEventListener("change", ()=> updateFileList(dzInput.files));
		updateFileList(); // initial empty state

		// progress bar
		const progress = document.createElement("div");
		progress.className = "progress-bar";
		progress.style.marginTop = "12px";
		progress.innerHTML = `<div class="progress-fill" style="width:0%"></div>`;

		// assemble modal body
		const body = document.createElement("div");
		const headerNote = document.createElement("div");
		headerNote.style.marginBottom = "10px";
		headerNote.style.fontWeight = "700";
		headerNote.textContent = "Upload Files";
		body.append(headerNote, dz, chooseBtn, fileList, progress);

		const modal = openModal({
			title: "Upload Files",
			body,
			actions: [
				{ label: "Cancel" },
				{ label: "Upload", primary: true, onClick: (close, content) => {
					const files = dzInput.files;
					if (!files?.length) { alert("Select files first."); return; }
					const fill = $(".progress-fill", content);
					let p = 0;
					const t = setInterval(()=>{
						p = clamp(p + 14); fill.style.width = p + "%";
						if (p >= 100){
							clearInterval(t);
							// append to DOCS (simulate)
							[...files].forEach(f=>{
								const ext = f.name.split(".").pop()||"";
								DOCS.push({
									name: f.name,
									type: extToType(ext),
									size: `${Math.ceil(f.size/1024)} KB`,
									modified: new Date().toISOString().slice(0,16).replace("T"," "),
									owner: "Admin"
								});
							});
							renderDocs();
							close();
						}
					}, 120);
				} }
			]
		});
		// ensure icons (chooseBtn icon, etc) are rendered
		icons();
	});

	/* -------------------- DEBUG: sample data generators (remove in production) -------------------- */
	// generate fake audit logs (for testing)
	function genFakeLogs(n=10) {
		const users = ["Admin","John Doe","Jane Smith","Alex Johnson","Chris Lee"];
		const actions = ["Uploaded file","Deleted file","Updated document","Shared folder","Downloaded report"];
		const logs = [];
		for (let i = 0; i < n; i++) {
			logs.push({
				time: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000).toISOString(),
				user: users[Math.floor(Math.random() * users.length)],
				action: actions[Math.floor(Math.random() * actions.length)]
			});
		}
		window.__AUDIT_SAMPLE = logs;
		return logs;
	}
	// generate fake activity data (for testing)
	function genFakeActivity(n=10) {
		const users = ["Admin","John Doe","Jane Smith","Alex Johnson","Chris Lee"];
		const actions = ["Uploaded file","Deleted file","Updated document","Shared folder","Downloaded report"];
		const activity = [];
		for (let i = 0; i < n; i++) {
			activity.push({
				user: users[Math.floor(Math.random() * users.length)],
				action: actions[Math.floor(Math.random() * actions.length)],
				time: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000).toISOString()
			});
		}
		window.__ACTIVITY_SAMPLE = activity;
		return activity;
	}
	// generate fake users (for testing)
	function genFakeUsers(n=10) {
		const users = [];
		for (let i = 1; i <= n; i++) {
			const approved = Math.random() < 0.7;
			users.push({
				id: i,
				name: `User ${i}`,
				email: `user${i}@example.com`,
				approved
			});
		}
		window.__USERS_SAMPLE = users;
		return users;
	}

	// DEBUG: generate and show sample data
	(function debugSampleData() {
		genFakeLogs(50);
		genFakeActivity(100);
		genFakeUsers(10);
		// show in console
		console.table(window.__AUDIT_SAMPLE);
		console.table(window.__ACTIVITY_SAMPLE);
		console.table(window.__USERS_SAMPLE);
	})();
});
