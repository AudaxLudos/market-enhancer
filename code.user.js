// ==UserScript==
// @name        Dead frontier UI Enhancer
// @icon        https://www.google.com/s2/favicons?sz=64&domain=deadfrontier.com
// @namespace   https://github.com/AudaxLudos/
// @author      AudaxLudos
// @license     MIT
// @version     1.0
// @description Enhances the market and inventory UI for Dead Frontier 3D
// @match       https://fairview.deadfrontier.com/onlinezombiemmo/*
// @homepageURL https://github.com/AudaxLudos/df-ui-enhancer
// @supportURL  https://github.com/AudaxLudos/df-ui-enhancer/issues
// @downloadURL https://raw.githubusercontent.com/AudaxLudos/df-ui-enhancer/main/code.user.js
// @updateURL   https://raw.githubusercontent.com/AudaxLudos/df-ui-enhancer/main/code.user.js
// ==/UserScript==

(function () {
	"use strict";

	let globalData = unsafeWindow.globalData;
	let userVars = unsafeWindow.userVars;
	let tradeData = {};

	////////////////////////////
	// UTILITY FUNCTIONS
	////////////////////////////
	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function serializeObject(obj) {
		var pairs = [];
		for (var prop in obj) {
			if (!obj.hasOwnProperty(prop)) {
				continue;
			}
			pairs.push(prop + "=" + obj[prop]);
		}
		return pairs.join("&");
	}

	function makeRequest(requestUrl, requestParams, callbackFunc, callBackParams) {
		return new Promise((resolve) => {
			var xhttp = new XMLHttpRequest();
			var payload = null;
			xhttp.onreadystatechange = function () {
				if (this.readyState == 4 && this.status == 200) {
					//Invoke the callback with the request response text and some parameters, if any were supplied
					//then resolve the Promise with the callback's reponse
					let callbackResponse = null;
					if (callbackFunc != null) {
						callbackResponse = callbackFunc(this.responseText, callBackParams);
					}
					if (callbackResponse == null) {
						callbackResponse = true;
					}
					resolve(callbackResponse);
				}
			};

			payload = serializeObject(requestParams);

			xhttp.open("POST", requestUrl, true);
			xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhttp.setRequestHeader("x-requested-with", "SilverScriptRequest");
			payload = "hash=" + unsafeWindow.hash(payload) + "&" + payload;
			xhttp.send(payload);
		});
	}

	function makeScrapRequest(itemId, inventorySlot, itemScrapValue) {
		let requestParams = {};
		requestParams["pagetime"] = userVars["pagetime"];
		requestParams["templateID"] = "0";
		requestParams["sc"] = userVars["sc"];
		requestParams["creditsnum"] = "0";
		requestParams["buynum"] = "0";
		requestParams["expected_itemprice"] = "";
		requestParams["expected_itemtype2"] = "";
		requestParams["expected_itemtype"] = itemId; // item code/id
		requestParams["itemnum2"] = "";
		requestParams["itemnum"] = inventorySlot; // inventory slot
		requestParams["price"] = itemScrapValue; // item scrap price
		requestParams["action"] = "scrap";
		requestParams["gv"] = "21";
		requestParams["userID"] = userVars["userID"];
		requestParams["password"] = userVars["password"];

		return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", requestParams, updateInventory, null);
	}

	function makeStoreRequest(itemId, inventorySlot, itemScrapValue) {
		let requestParams = {};
		requestParams["pagetime"] = userVars["pagetime"];
		requestParams["templateID"] = "0";
		requestParams["sc"] = userVars["sc"];
		requestParams["creditsnum"] = "0";
		requestParams["buynum"] = "0";
		requestParams["renameto"] = "undefined`undefined";
		requestParams["expected_itemprice"] = "-1";
		requestParams["expected_itemtype2"] = "";
		requestParams["expected_itemtype"] = itemId; // item code/id
		requestParams["itemnum2"] = `${unsafeWindow.findFirstEmptyStorageSlot() + 40}`; // storage slot
		requestParams["itemnum"] = inventorySlot; // inventory slot
		requestParams["price"] = itemScrapValue; // item scrap price
		requestParams["action"] = "store";
		requestParams["gv"] = "21";
		requestParams["userID"] = userVars["userID"];
		requestParams["password"] = userVars["password"];

		return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", requestParams, updateInventory, null);
	}

	function makeTakeRequest(itemId, storageSlot, itemScrapValue) {
		let requestParams = {};
		requestParams["pagetime"] = userVars["pagetime"];
		requestParams["templateID"] = "0";
		requestParams["sc"] = userVars["sc"];
		requestParams["creditsnum"] = "0";
		requestParams["buynum"] = "0";
		requestParams["renameto"] = "undefined`undefined";
		requestParams["expected_itemprice"] = "-1";
		requestParams["expected_itemtype2"] = "";
		requestParams["expected_itemtype"] = itemId; // item code/id
		requestParams["itemnum2"] = `${unsafeWindow.findFirstEmptyGenericSlot("inv")}`; // inventory slot
		requestParams["itemnum"] = storageSlot + 40; // storage slot
		requestParams["price"] = itemScrapValue; // item scrap price
		requestParams["action"] = "take";
		requestParams["gv"] = "21";
		requestParams["userID"] = userVars["userID"];
		requestParams["password"] = userVars["password"];

		return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", requestParams, updateInventory, null);
	}

	function makeGetStorageRequest() {
		let requestParams = {};
		requestParams["pagetime"] = userVars["pagetime"];
		requestParams["sc"] = userVars["sc"];
		requestParams["userID"] = userVars["userID"];
		requestParams["password"] = userVars["password"];

		return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/get_storage.php", requestParams, updateStorage, null);
	}

	function updateStorage(storageData) {
		unsafeWindow.storageBox = unsafeWindow.flshToArr(storageData);
		unsafeWindow.populateStorage();
	}

	function updateInventory(inventoryData) {
		unsafeWindow.updateIntoArr(unsafeWindow.flshToArr(inventoryData, "DFSTATS_"), unsafeWindow.userVars);
		unsafeWindow.populateInventory();
		unsafeWindow.populateCharacterInventory();
	}

	////////////////////////////
	// UI ENCHANCERS
	////////////////////////////
	function scrapInventoryHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=24") == -1) {
			return;
		}
		let scrapAllButton = document.createElement("button");
		scrapAllButton.id = "customScrapAllButton";
		scrapAllButton.innerHTML = "Scrap All Items";
		scrapAllButton.classList.add("opElem");
		scrapAllButton.style.top = "418px";
		scrapAllButton.style.left = "410px";
		unsafeWindow.inventoryHolder.appendChild(scrapAllButton);

		scrapAllButton.addEventListener("click", (e) => {
			let prompt = document.getElementById("prompt");
			let gamecontent = document.getElementById("gamecontent");
			let validItems = [];
			let totalCost = 0;

			[...unsafeWindow.inventory.getElementsByClassName("validSlot")]
				.filter((node) => node.hasChildNodes() && !node.classList.contains("locked"))
				.forEach((slotWithItem) => {
					let itemElement = slotWithItem.firstChild;
					let id = itemElement.getAttribute("data-type");
					let quantity = itemElement.getAttribute("data-quantity") ? itemElement.getAttribute("data-quantity") : 1;
					let scrapValue = unsafeWindow.scrapValue(id, quantity);
					validItems.push({
						slot: slotWithItem.getAttribute("data-slot"),
						id: id,
						scrapValue: scrapValue,
					});
					totalCost += scrapValue;
				});

			prompt.style.display = "block";
			gamecontent.classList.add("warning");
			gamecontent.innerHTML = `
					Are you sure you want to scrap your <span style="color: red;">Inventory</span> for <span style="color: #FFCC00;">$${totalCost}</span>?
				`;

			let yesButton = document.createElement("button");
			yesButton.style.position = "absolute";
			yesButton.style.left = "86px";
			yesButton.style.bottom = "8px";
			yesButton.innerHTML = "Yes";
			yesButton.addEventListener("click", async (e) => {
				for (const [index, value] of validItems.entries()) {
					await new Promise((resolve) => {
						gamecontent.classList.remove("warning");
						unsafeWindow.promptLoading("Scrapping inventory items...");
						unsafeWindow.playSound("shop_buysell");
						resolve();
					});
					await makeScrapRequest(value.id, value.slot, value.scrapValue);
					await new Promise((resolve) => {
						if (index === validItems.length - 1) unsafeWindow.updateAllFields();
						resolve();
					});
					await sleep(Math.random() * (300 - 150) + 150);
				}
			});
			gamecontent.appendChild(yesButton);

			let noButton = document.createElement("button");
			noButton.style.position = "absolute";
			noButton.style.right = "86px";
			noButton.style.bottom = "8px";
			noButton.innerHTML = "No";
			noButton.addEventListener("click", (e) => {
				prompt.style.display = "none";
				gamecontent.innerHTML = "";
			});
			gamecontent.appendChild(noButton);
		});
	}

	function storeStorageHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=50") == -1) {
			return;
		}
		let storeInventoryButton = document.createElement("button");
		storeInventoryButton.id = "customStoreInventoryButton";
		storeInventoryButton.innerHTML = "Store All Items";
		storeInventoryButton.classList.add("opElem");
		storeInventoryButton.style.top = "418px";
		storeInventoryButton.style.left = "120px";
		unsafeWindow.inventoryHolder.appendChild(storeInventoryButton);

		storeInventoryButton.addEventListener("click", async (e) => {
			let validItems = [];
			[...unsafeWindow.inventory.getElementsByClassName("validSlot")]
				.filter((node) => node.hasChildNodes() && !node.classList.contains("locked"))
				.forEach((slotWithItem) => {
					let itemElement = slotWithItem.firstChild;
					let id = itemElement.getAttribute("data-type");
					let quantity = itemElement.getAttribute("data-quantity") ? itemElement.getAttribute("data-quantity") : 1;
					let scrapValue = unsafeWindow.scrapValue(id, quantity);
					validItems.push({
						slot: slotWithItem.getAttribute("data-slot"),
						id: id,
						scrapValue: scrapValue,
					});
				});

			for (const [index, value] of validItems.entries()) {
				await new Promise((resolve) => {
					unsafeWindow.promptLoading("Storing inventory items to storage...");
					unsafeWindow.playSound("swap");
					resolve();
				});
				await makeStoreRequest(value.id, value.slot, value.scrapValue);
				await makeGetStorageRequest();
				await new Promise((resolve, reject) => {
					if (unsafeWindow.findFirstEmptyStorageSlot() === false) {
						reject("Storage is full");
						unsafeWindow.updateAllFields();
						return;
					} else if (index === validItems.length - 1) {
						unsafeWindow.updateAllFields();
					}
					resolve();
				});
				await sleep(Math.random() * (100 - 50) + 50);
			}
		});
	}

	function takeStorageHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=50") == -1) {
			return;
		}
		let takeStorageButton = document.createElement("button");
		takeStorageButton.id = "customStoreInventoryButton";
		takeStorageButton.innerHTML = "Take All Items";
		takeStorageButton.classList.add("opElem");
		takeStorageButton.style.top = "71px";
		takeStorageButton.style.left = "120px";
		unsafeWindow.inventoryHolder.appendChild(takeStorageButton);

		takeStorageButton.addEventListener("click", async (e) => {
			let validItems = [];
			let storageSlots = userVars.DFSTATS_df_storage_slots;

			for (let i = 1; i <= storageSlots; i++) {
				if (unsafeWindow.storageBox[`df_store${i}_type`] != null) {
					let slot = i;
					let id = unsafeWindow.storageBox[`df_store${i}_type`];
					let quantity = unsafeWindow.storageBox[`df_store${i}_quantity`].replace(/\D/g, "");
					let scrapValue = unsafeWindow.scrapValue(id, quantity);
					validItems.push({
						slot: slot,
						id: id,
						scrapValue: scrapValue,
					});
				}
			}

			for (const [index, value] of validItems.entries()) {
				await new Promise((resolve) => {
					unsafeWindow.promptLoading("Taking storage items to inventory...");
					unsafeWindow.playSound("swap");
					resolve();
				});
				await makeTakeRequest(value.id, value.slot, value.scrapValue);
				await makeGetStorageRequest();
				await sleep(Math.random() * (100 - 50) + 50);
				await new Promise((resolve, reject) => {
					if (unsafeWindow.findFirstEmptyGenericSlot("inv") === false) {
						reject("Inventory is full");
						unsafeWindow.updateAllFields();
						return;
					} else if (index === validItems.length - 1) {
						unsafeWindow.updateAllFields();
					}
					resolve();
				});
			}
		});
	}

	function replenishHungerHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1) {
			return;
		}
		let hungerElement = document.getElementsByClassName("playerNourishment")[0];
		hungerElement.style.top = "";
		let replenishHungerButton = document.createElement("button");
		replenishHungerButton.id = "customReplenishHungerButton";
		replenishHungerButton.classList.add("opElem");
		replenishHungerButton.style.left = "37px";
		replenishHungerButton.style.top = "25px";
		replenishHungerButton.innerHTML = "Replenish";
		hungerElement.parentElement.appendChild(replenishHungerButton);

		// on element enter fetch trade data
		// do not refetch data unless reload or a few seconds/minutes has passed
		// on button click start replenishing process
		// find appropriate food to replenish nourishment
		// calculate if food needs to be cooked or not
		//
	}

	function getFoodList() {
		let foods = Object.values(globalData).filter((value) => {
			return value["foodrestore"] > 0;
		});
		// add raw food restore to every food
		// add cooked food restore to every food
	}

	function healHealthHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1) {
			return;
		}
		let healthElement = document.getElementsByClassName("playerHealth")[0];
		healthElement.style.top = "";
		let restoreHealthButton = document.createElement("button");
		restoreHealthButton.id = "customRestoreHealthButton";
		restoreHealthButton.innerHTML = "Restore";
		healthElement.appendChild(document.createElement("br"));
		healthElement.appendChild(restoreHealthButton);
	}

	function repairArmorHelper() {
		if (unsafeWindow.inventoryHolder == null || window.location.href.indexOf("index.php?page=35") == -1) {
			return;
		}
		let armourElement = document.getElementById("sidebarArmour").getElementsByClassName("opElem")[0];
		let repairArmorButton = document.createElement("button");
		repairArmorButton.id = "customRepairArmorButtonButton";
		repairArmorButton.innerHTML = "Repair";
		armourElement.appendChild(document.createElement("br"));
		armourElement.appendChild(repairArmorButton);
	}

	function closePopupAds() {
		let popupElement = document.getElementById("DFAdBoxData");
		if (popupElement) {
			document.getElementById("fancybox-overlay").style.display = "none";
			document.getElementById("fancybox-wrap").style.display = "none";
			document.getElementById("DFAdBoxData").parentElement.remove();
		}
	}

	function modifyUserInterface() {
		if (unsafeWindow.jQuery == null) {
			return;
		}
		if (window.location.href.indexOf("index.php?page=21") > -1) {
			// Should only run when going out to inner city
			// Hide flash/unity web player custom browser link
			$("body > table:nth-child(1)").hide();
			// Modify back to outpost button
			$("form[action*='hotrods/hotfunctions.php'] > input[id=backToOutpostSubmit]").val("Return to Outpost");
			$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.maxWidth = "fit-content";
			$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.marginLeft = "auto";
			$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.marginRight = "auto";
			$("form[action*='hotrods/hotfunctions.php']").parent()[0].style.top = "-520px";
			// Hide open chat button
			$("a[href='https://discordapp.com/invite/deadfrontier2']").parent().hide();
			// Hide main footer
			$("body > table:nth-child(2) > tbody > tr > td > table").hide();
			return;
		}
		// Hide facebook like button
		$("iframe[src*='https://www.facebook.com/plugins/like.php?href=https://www.facebook.com/OfficialDeadFrontier/&width&layout=button_count&action=like&show_faces=false&share=true&height=35&appId=']").hide();
		// Hide social links
		$("body > table:nth-child(2)").hide();
		// Hide main footer
		$("body > table:nth-child(3)").hide();
	}

	function addOutpostQuickLinks() {
		if (unsafeWindow.jQuery == null) {
			return;
		}
		let outpostLinks = [
			{ name: "Marketplace", id: "35" },
			{ name: "Yard", id: "24" },
			{ name: "Bank", id: "15" },
			{ name: "Storage", id: "50" },
			{ name: "Crafting", id: "59" },
			{ name: "Vendor", id: "84" },
			{ name: "Records", id: "22" },
			{ name: "Gambling Den", id: "49" },
			{ name: "Fast Travel", id: "61" },
		];
		let mainScreenEdge = $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_edge.jpg']").offset();
		if (!mainScreenEdge) {
			return;
		}
		let linksContainer = document.createElement("div");
		linksContainer.id = "customOutpostLinks";
		linksContainer.style.width = "120px";
		linksContainer.style.display = "grid";
		linksContainer.style.rowGap = "5px";
		linksContainer.style.padding = "5px";
		linksContainer.style.border = "1px solid #990000";
		linksContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
		linksContainer.style.position = "absolute";
		linksContainer.style.top = `${mainScreenEdge.top}px`;
		linksContainer.style.right = `${mainScreenEdge.left + 60}px`;
		linksContainer.style.zIndex = "20";

		for (let i in outpostLinks) {
			let linkDiv = document.createElement("div");
			linkDiv.style.textAlign = "center";

			let linkButton = document.createElement("button");
			linkButton.setAttribute("data-page", outpostLinks[i].id);
			linkButton.setAttribute("data-mod", "0");
			linkButton.setAttribute("data-sound", "1");
			linkButton.innerHTML = outpostLinks[i].name;
			linkDiv.appendChild(linkButton);
			linksContainer.appendChild(linkDiv);

			linkButton.addEventListener("click", function (event) {
				// Change page on click
				unsafeWindow.nChangePage(event);
			});
		}

		document.body.appendChild(linksContainer);

		// Adjust window when screen resizes
		window.addEventListener(
			"resize",
			function (event) {
				let mainScreenEdge = $("td[background*='https://files.deadfrontier.com/deadfrontier/DF3Dimages/mainpage/right_edge.jpg']").offset();
				let linksContainer = document.getElementById("customOutpostLinks");
				linksContainer.style.top = `${mainScreenEdge.top}px`;
				linksContainer.style.right = `${mainScreenEdge.left + 60}px`;
			},
			true
		);
	}

	function addQuickMarketSearchListener() {
		inventoryHolder.addEventListener("dblclick", (event) => {
			if (unsafeWindow.marketHolder == null) {
				return;
			}

			const searchField = document.getElementById("searchField");
			const searchButton = document.getElementById("makeSearch");
			const searchCategory = document.getElementById("categoryChoice");

			if (searchField == null || searchButton == null || searchCategory == null) {
				return;
			}

			if (event.target.classList.contains("item")) {
				document.getElementById("cat").innerHTML = "Everything";
				searchCategory.setAttribute("data-catname", "");
				searchCategory.setAttribute("data-cattype", "");
				searchField.value = "";
				let itemName = globalData[event.target.getAttribute("data-type").replace(/_.*/, "")].name;
				searchField.value = itemName;
				searchButton.disabled = false;
				searchButton.click();
			}
		});
	}

	function addClearSearchOnCategoryClickListener() {
		inventoryHolder.addEventListener("click", (event) => {
			if (unsafeWindow.marketHolder == null) {
				return;
			}

			const searchField = document.getElementById("searchField");

			if (searchField == null) {
				return;
			}

			if (event.target.id == "cat" || event.target.id == "categoryChoice") {
				searchField.value = "";
			}
		});
	}

	////////////////////////////
	// INJECT SCRIPTS
	////////////////////////////
	setTimeout(() => {
		closePopupAds();
		addOutpostQuickLinks();
		modifyUserInterface();
		scrapInventoryHelper();
		storeStorageHelper();
		takeStorageHelper();
		replenishHungerHelper();
		healHealthHelper();
		repairArmorHelper();

		if (unsafeWindow.inventoryHolder != null) {
			addQuickMarketSearchListener();
			addClearSearchOnCategoryClickListener();
		}
	}, 500);
})();
