# pdjr-skplugin-solarhotwater

Controller for solar powered hot water generation.

## Background

My ship has a solar panel array which is used to charge the ship's
domestic battery bank.
Quite often the battery bank becomes fully charged and continuing
output of the solar panel array remains unused.

This plugin was developed so that surplus energy from the solar panel
array could be used to heat the ship's thermal store by operating an
immersion heater.
Of course, running an electric water heater usually consumes more power
than the solar array can supply so top-up from the ship's battery is
necessary, but modulating water heating against battery recharge makes
a reasonable strategy that allows the battery bank to remain almost
fully charged and the water in the thermal store to be successfully
heated.

Although **pdjr-skplugin-solarhotwater** addresses a particular
issue, the plugin implements a simple generic algorithm which raises
a binary control signal dependent upon the output of some power source
and a connected battery's state of charge.
This behaviour can be used to control an arbitrary target device and
have broader application than just water heating.

## Configuration

The plugin recognises the following configuration properties.

Property                 | Description | Default value
:----------------------- | :--- | ---
enablepath               | Signal K path which indicates whether or not the plugin should operate (value = 1 says 'yes', value = '0' says 'no') | 'control.solarhotwater.enabled'
outputpath               | Signal K path which will have its value set to 1 when water heating should be ON and 0 when heating should be OFF. | 'control.solarhotwater.output'
batterysocpath           | The Signal K path which reports battery SOC. | ''
batterysocstartthreshold | The SOC at which the controller should start heating (if other conditions are met). | 1.0
batterysocstopthreshold  | The SOC at which the controller should stop heating. | 0.95
powerpath                | The Signal K path which reports the output of the power source Watts. | ''
powerthreshold           | The power source output in Watts above which heating should be allowed. | 400

## Operation

1. ```outputpath``` is set to OFF (0) on startup.

2. Whilst ```enablepath``` is (1), the plugin checks the value on
   ```batterysocpath``` to see if it is above
   ```batterysocstartthreshold``` and if so, operation of the plugin
   is allowed and will remain allowed until the value of
   ```batterysocpath``` falls below ```battersocstopthreshold```.

3. If operation is allowed and ```enablebath``` is (1) then the value
   of ```solarpowerpath``` is checked to see if it is greater than
   ```solarpowerthreshold```, and, if so, ```outputpath``` is set to
   (1), otherwise to (0).

## Author

Paul Reeve <*preeve_at_pdjr_dot_eu*>
