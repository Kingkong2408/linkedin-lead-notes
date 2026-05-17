(function () {
	let currentUrl = window.location.href;

	function isLinkedInProfilePage() {
		return /^https:\/\/www\.linkedin\.com\/in\/[^/]+\/?/.test(window.location.href);
	}

	function getProfileUrl() {
		return window.location.href.split("?")[0].split("#")[0];
	}

	function getSlugFromProfileUrl(profileUrl) {
		const match = profileUrl.match(/linkedin\.com\/in\/([^/]+)/);

		if (!match || !match[1]) {
			return "";
		}

		return match[1]
			.toLowerCase()
			.replace(/[0-9]/g, "")
			.replace(/-/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	function normalizeText(text) {
		return text
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z\s]/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	function cleanProfileName(text) {
		return text
			.replace(/\s+/g, " ")
			.replace("Verifizierungs-Badge hinzufügen", "")
			.replace("Add verification badge", "")
			.replace(/[\u00b7\u2022]\s*[123]\.?/g, "")
			.replace(/\s+[123]\.$/, "")
			.trim();
	}

	function nameMatchesProfileUrl(name, profileUrl) {
		const slug = getSlugFromProfileUrl(profileUrl);
		const normalizedName = normalizeText(name);

		if (!slug || !normalizedName) {
			return false;
		}

		const slugWords = slug
			.split(" ")
			.filter((word) => word.length >= 3);

		if (slugWords.length === 0) {
			return false;
		}

		return slugWords.some((word) => normalizedName.includes(word));
	}

	function isBadName(text) {
		const badValues = [
			"Lead Notes",
			"Profilsprache",
			"Profile language",
			"Öffentliches Profil & URL",
			"Public profile & URL",
			"Vorschläge für Sie",
			"Suggested for you",
			"Analysen",
			"Analytics",
			"Aktivitäten",
			"Activity",
			"Highlights",
			"Erfahrung",
			"Experience",
			"Ausbildung",
			"Education",
			"Kenntnisse",
			"Skills",
			"Empfehlungen",
			"Recommendations",
			"Interessen",
			"Interests",
			"Feed",
			"Info",
			"Premium-Profile erkunden"
		];

		if (!text) return true;
		if (badValues.includes(text)) return true;
		if (text.length < 2) return true;
		if (text.length > 80) return true;
		if (text.includes("|")) return true;
		if (text.includes("LinkedIn")) return true;
		if (text.includes("Follower")) return true;
		if (text.includes("followers")) return true;
		if (text.includes("Kontakte")) return true;
		if (text.includes("contacts")) return true;
		if (text.includes("Kontaktinformationen")) return true;
		if (text.includes("Contact info")) return true;

		return false;
	}

	function getNameFromDocumentTitle(profileUrl) {
		const rawTitle = document.title || "";
		const name = cleanProfileName(rawTitle.split("|")[0]);

		if (isBadName(name)) {
			return "";
		}

		if (!nameMatchesProfileUrl(name, profileUrl)) {
			return "";
		}

		return name;
	}

	function getNameFromVisibleHeadings(profileUrl) {
		const selectors = [
			"main h1",
			"main h2",
			"section h1",
			"section h2",
			"h1",
			"h2"
		];

		const elements = Array.from(document.querySelectorAll(selectors.join(",")));

		for (const element of elements) {
			const rawText = element.innerText || element.textContent || "";
			const name = cleanProfileName(rawText);

			if (isBadName(name)) {
				continue;
			}

			if (!nameMatchesProfileUrl(name, profileUrl)) {
				continue;
			}

			return name;
		}

		return "";
	}

	function getProfileName(profileUrl) {
		const titleName = getNameFromDocumentTitle(profileUrl);

		if (titleName) {
			return titleName;
		}

		const headingName = getNameFromVisibleHeadings(profileUrl);

		if (headingName) {
			return headingName;
		}

		return "";
	}

	function fillProfileNameWhenReady(nameInput, profileUrl) {
		let attempts = 0;

		nameInput.value = "";
		nameInput.placeholder = "Loading profile...";
		nameInput.disabled = true;

		const interval = setInterval(() => {
			const widget = document.getElementById("lln-widget");

			if (!widget || widget.dataset.profileUrl !== profileUrl) {
				clearInterval(interval);
				return;
			}

			const name = getProfileName(profileUrl);

			if (name) {
				nameInput.value = name;
				nameInput.placeholder = "Enter lead name";
				nameInput.disabled = false;
				clearInterval(interval);
				return;
			}

			if (attempts >= 40) {
				nameInput.value = "";
				nameInput.placeholder = "Enter lead name";
				nameInput.disabled = false;
				clearInterval(interval);
				return;
			}

			attempts++;
		}, 250);
	}

	function removeWidget() {
		const existingWidget = document.getElementById("lln-widget");

		if (existingWidget) {
			existingWidget.remove();
		}
	}

	function createWidget() {
		if (!isLinkedInProfilePage()) {
			removeWidget();
			return;
		}

		const profileUrl = getProfileUrl();
		const existingWidget = document.getElementById("lln-widget");

		if (existingWidget && existingWidget.dataset.profileUrl === profileUrl) {
			return;
		}

		if (existingWidget) {
			existingWidget.remove();
		}

		const widget = document.createElement("div");
		widget.id = "lln-widget";
		widget.dataset.profileUrl = profileUrl;

		widget.innerHTML = `
			<div class="lln-header">Lead Notes</div>

			<label class="lln-label" for="lln-name">Lead Name</label>
			<input id="lln-name" placeholder="Loading profile..." disabled />

			<label class="lln-label" for="lln-note">Notes</label>
			<textarea id="lln-note" placeholder="Write note..."></textarea>

			<label class="lln-label" for="lln-status">Status</label>
			<select id="lln-status">
				<option value="New">New</option>
				<option value="Contacted">Contacted</option>
				<option value="Interesting">Interesting</option>
				<option value="Not relevant">Not relevant</option>
			</select>

			<button id="lln-save">Save Lead</button>
			<div id="lln-message"></div>
		`;

		document.body.appendChild(widget);

		const nameInput = document.getElementById("lln-name");
		const noteInput = document.getElementById("lln-note");
		const statusInput = document.getElementById("lln-status");
		const message = document.getElementById("lln-message");

		chrome.storage.local.get(["leads"], (result) => {
			const activeWidget = document.getElementById("lln-widget");

			if (!activeWidget || activeWidget.dataset.profileUrl !== profileUrl) {
				return;
			}

			const leads = result.leads || [];
			const existing = leads.find((lead) => lead.url === profileUrl);

			if (existing) {
				nameInput.value = existing.name || "";
				nameInput.placeholder = "Enter lead name";
				nameInput.disabled = false;
				noteInput.value = existing.note || "";
				statusInput.value = existing.status || "New";
			} else {
				fillProfileNameWhenReady(nameInput, profileUrl);
			}
		});

		document.getElementById("lln-save").addEventListener("click", () => {
			const activeProfileUrl = widget.dataset.profileUrl;

			chrome.storage.local.get(["leads"], (result) => {
				const leads = result.leads || [];

				const lead = {
					url: activeProfileUrl,
					name: nameInput.value.trim(),
					note: noteInput.value.trim(),
					status: statusInput.value,
					updatedAt: new Date().toISOString()
				};

				const filtered = leads.filter((item) => item.url !== activeProfileUrl);
				filtered.push(lead);

				chrome.storage.local.set({ leads: filtered }, () => {
					message.textContent = "Saved";

					setTimeout(() => {
						message.textContent = "";
					}, 1500);
				});
			});
		});
	}

	function handleRouteChange() {
		const newUrl = window.location.href;

		if (newUrl === currentUrl) {
			return;
		}

		currentUrl = newUrl;

		if (isLinkedInProfilePage()) {
			removeWidget();

			setTimeout(() => {
				createWidget();
			}, 300);
		} else {
			removeWidget();
		}
	}

	function patchHistoryMethod(methodName) {
		const original = history[methodName];

		history[methodName] = function () {
			const result = original.apply(this, arguments);

			window.dispatchEvent(new Event("locationchange"));

			return result;
		};
	}

	patchHistoryMethod("pushState");
	patchHistoryMethod("replaceState");

	window.addEventListener("popstate", () => {
		window.dispatchEvent(new Event("locationchange"));
	});

	window.addEventListener("locationchange", handleRouteChange);

	const observer = new MutationObserver(() => {
		if (isLinkedInProfilePage()) {
			createWidget();
		} else {
			removeWidget();
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

	createWidget();
})();