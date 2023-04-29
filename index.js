/**********************************************************************
 * Copyright 2022 Paul Reeve <preeve@pdjr.eu>
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you
 * may not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const Log = require("./lib/signalk-liblog/Log.js");
const Delta = require("./lib/signalk-libdelta/Delta.js");

const PLUGIN_ID = "solarhotwater";
const PLUGIN_NAME = "pdjr-skplugin-solarhotwater";
const PLUGIN_DESCRIPTION = "Controller for solar hot water generation";

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = [];

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = PLUGIN_DESCRIPTION;

  const bacon = require('baconjs');
  const log = new Log(plugin.id, { ncallback: app.setPluginStatus, ecallback: app.setPluginError });
  const delta = new Delta(app, plugin.id);

  plugin.schema = {
    "type": "object",
    "properties": {
      "enablepath": {
        "title": "Enable path",
        "description": "Path name of value which switches service on (1) or off (0)",
        "type": "string"
      }, 
      "outputpath": {
        "title": "Output path",
        "description": "Path name of value which will be used to switch heating on (1) or off (0)",
        "type": "string"
      },
      "batterysocpath": {
        "title": "Battery SOC path",
        "description": "Path name of value reporting battery state of charge",
        "type": "string"
      },
      "batterysocstartthreshold": {
        "title": "Battery SOC start threshold",
        "description": "Battery SOC must be at least equal to this value before output can be switched on",
        "type": "number"
      },
      "batterysocstopthreshold": {
        "title": "SOC stop threshold",
        "description": "Battery SOC must remain above this value for output to remain on",
        "type": "number"
      },
      "powerpath": {
        "title": "Power path",
        "description": "Path name of value reporting power source output",
        "type": "string"
      },
      "powerthreshold": {
        "title": "Power threshold",
        "description": "Power source output power must be at least equal to this value for output to remain on",
        "type": "number"
      }
    },
    "default": {
      "enablepath": "mqtt.switch.solar_hot_water",
      "outputpath": "plugins.solarhotwater.state",
      "batterysocpath": "electrical.batteries.278.capacity.stateOfCharge",
      "batterysocstartthreshold": 99,
      "batterysocstopthreshold": 95,
      "powerpath": "electrical.solar.279.panelPower",
      "powerthreshold": 400
    }
  }
  
  plugin.uiSchema = function() {}

  plugin.start = function(options) {
    var batterySocPermits = 0;
    var heaterState = 0;
    var lastEnabledState = -1, lastBatterySocPermits = -1, lastHeaterState = -1;

    // Switch off the heater...
    delta.clear().addValue(options.outputpath, heaterState).commit();

    if (options) {
      // Check availability of enabling control...
      var enablestream = app.streambundle.getSelfStream(options.enablepath);
      if (enablestream) {
        // Check availability of battery SOC data...
        var batterysocstream = app.streambundle.getSelfStream(options.batterysocpath);
        if (batterysocstream) {
          // Check availability of solar power data...
          var powerstream = app.streambundle.getSelfStream(options.powerpath);
          if (powerstream) {
            // Subscribe to data streams...
            unsubscribes.push(bacon.combineAsArray(enablestream.skipDuplicates(), batterysocstream.skipDuplicates(), powerstream.skipDuplicates()).onValue(([enabled, soc, power]) => {
	            enabled = parseInt(enabled);
              if (enabled) {
                soc = parseInt(soc * 100);
		            power = parseInt(power);
                // Use SOC to determine if heating is viable whilst maintaining battery state...
                if (batterySocPermits == 0) {
                  if (soc >= options.batterysocstartthreshold) {
                    batterySocPermits = 1;
                  }
                } else {
                  if (soc <= options.batterysocstopthreshold) {
                    batterySocPermits = 0;
                    heaterState = 0;
                  }
                }
                // If heating is enabled switch heating on and off dependent upon solar power output... 
                if (batterySocPermits === 1) {
                  heaterState = (power > options.powerthreshold)?1:0;
                }
                if (heaterState === 1) {
                  if ((lastEnabledState != enabled) || (lastHeaterState != heaterState)) log.N("control output is enabled and ON");
                } else {
                  if ((lastEnabledState != enabled) || (lastBatterySocPermits != batterySocPermits) || (lastHeaterState != heaterState)) log.N("control output is enabled and OFF (%s)", (batterySocPermits === 1)?"power level too low":"battery SOC too low")
                }
                delta.clear().addValue(options.outputpath, heaterState).commit();
              } else {
                if (lastEnabledState != enabled) {
                  log.N("control output is disabled");
                  delta.clear().addValue(options.outputpath, 0).commit();
		            }
              }
              lastEnabledState = enabled; lastBatterySocPermits = batterySocPermits; lastHeaterState = heaterState;
            }));
          } else {
            log.E("cannot connect to power stream on '%s'", options.solarpowerpath);
          }
        } else {
          log.E("cannot connect to battery SOC stream on '%s'", options.batterysocpath);
        }
      } else {
        log.E("cannot connect to plugin control stream");
      }
    } else {
      log.E("bad or missing configuration");
    }
  }

  plugin.stop = function() {
    unsubscribes.forEach(f => f());
    unsubscribes = [];
  }
  
  return(plugin);
}

