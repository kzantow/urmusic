import React from 'react';

export default function SettingsNav() {
    return (
		<nav id="settingsNav" className="hidable">
			<header>
				<div id="hambParent">
					<div id="hamb" className="fa fa-bars w3-large"></div>
				</div>
				<h3>Settings</h3>
				<span className="fa fa-angle-right w3-xlarge" id="presetMenuOpenCloseBtn"></span>
			</header>
			<div id="settingsPresetsMenu">
				<div id="settingsPresetsMenuSizer">
					<header>
						<input type="text" placeholder="preset name" id="presetNameInput" />
						<ul id="settingsPresetsOptions">
							<li id="settingsPresetsOptOpen" className="fa fa-folder-open-o w3-xlarge"></li>
							<li id="settingsPresetsOptSave" className="fa fa-floppy-o w3-xlarge"></li>
						</ul>
					</header>
					<ul id="settingsPresetsList">
					</ul>
				</div>
			</div>
			<div id="settingsCtrlsContainer">
				<div>
					<ul id="globalSettings" className="settingsCtrlsList">
					</ul>
					
					<ul id="settingsSectionTabs">
						<li id="addTab" className="fa fa-plus w3-medium"></li>
					</ul>
					
					<ul id="sectionSettings" className="settingsCtrlsList">
					</ul>
					
					<h4>Advanced settings</h4>
					<ul id="advancedSettings" className="settingsCtrlsList">
					</ul>
				</div>
			</div>
		</nav>
    );
}
