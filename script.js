
let cdaBarChart = null;
  

function setPlaceholder(inputId, placeholderText) {
    var inputElement = document.getElementById(inputId);
    if (inputElement.value == '0') {
        inputElement.placeholder = placeholderText;
        inputElement.value = '';
    }
}

function clearPlaceholder(inputId, placeholderText) {
    var inputElement = document.getElementById(inputId);
    if (inputElement.value == '') {
        inputElement.placeholder = '0' + placeholderText;
        inputElement.value = '0';
    }
}

function secondsToHMS(seconds) {
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

function parseTimeToSecondsTest(timeStr) {
    if (!timeStr) return NaN;

    let parts;
    let hours = 0, minutes = 0, seconds = 0;

    if (timeStr.includes(':')) {
        parts = timeStr.split(':');

        if (parts.length === 3) {
            hours = parseInt(parts[0], 10) || 0;
            minutes = parseInt(parts[1], 10) || 0;
            seconds = parseFloat(parts[2]) || 0;
        } else if (parts.length === 2) {
            if (timeStr.indexOf(':') === 1 && parts[0].length === 1) {
                hours = parseInt(parts[0], 10) || 0;
                minutes = parseInt(parts[1], 10) || 0;
            } else {
                minutes = parseInt(parts[0], 10) || 0;
                seconds = parseFloat(parts[1]) || 0;
            }
        }
    } else if (timeStr.includes('.')) {
        parts = timeStr.split('.');
        seconds = parseInt(parts[0], 10) || 0;
        let milliseconds = parseFloat('0.' + parts[1]) || 0;
        return seconds + milliseconds;
    } else {
        seconds = parseFloat(timeStr) || 0;
    }

    return (hours * 3600) + (minutes * 60) + seconds;
}

function updatePlaceholderCda(testIndex) {
    const testDistance = parseFloat(document.getElementById(`distance-test${testIndex}`).value);
    const desiredTimeInput = document.getElementById(`time-test${testIndex}`);

    if (testDistance >= 25) {
        desiredTimeInput.placeholder = "h:mm:ss";
        desiredTimeInput.pattern = "^([0-9]?[0-9]):([0-5][0-9]):([0-5][0-9])$";
    } else if (testDistance <= 4 && testDistance > 0.5) {
        desiredTimeInput.placeholder = "mm:ss.SS";
        desiredTimeInput.pattern = "^([0-5]?[0-9]):([0-5][0-9])\\.([0-9]{1,2})$";
    } else if (testDistance <= 0.5) {
        desiredTimeInput.placeholder = "ss.SS";
        desiredTimeInput.pattern = "^([0-5]?[0-9])\\.([0-9]{1,2})$";
    } else {
        desiredTimeInput.placeholder = "mm:ss";
        desiredTimeInput.pattern = "^([0-5]?[0-9]):([0-5][0-9])$";
    }
}

function showResults() {
    document.querySelector('.results-container').classList.remove('hidden');
}

function calculateWindYawAngle(bikeSpeedMS, windSpeedMS, windAngleDegrees) {
    const windAngleRadians = windAngleDegrees * (Math.PI / 180);
    const yawAngle = Math.atan2(windSpeedMS * Math.sin(windAngleRadians), bikeSpeedMS + windSpeedMS * Math.cos(windAngleRadians));
    return yawAngle; // in radians
}

function calculatePowerSavings(cda, airDensity, speedKPH) {
    const speedMS = speedKPH / 3.6; // Convert speed from km/h to m/s
    return 0.5 * airDensity * cda * Math.pow(speedMS, 3);
}

function calculateCdA() {
    const weight = parseFloat(document.getElementById('weight-cda').value);
    const bikeWeight = parseFloat(document.getElementById('bike_weight-cda').value);
    const rollingResistance = parseFloat(document.getElementById('rolling_resistance-cda').value);
    const airDensity = parseFloat(document.getElementById('air_density-cda').value);
    const drivetrainEfficiency = parseFloat(document.getElementById('drivetrain_efficiency-cda').value);

    const tests = [
        {
            name: document.getElementById('test1-name').value || 'Test 1',
            distance: parseFloat(document.getElementById('distance-test1').value),
            time: document.getElementById('time-test1').value,
            power: parseFloat(document.getElementById('power-test1').value),
            windSpeed: parseFloat(document.getElementById('wind_speed-test1').value),
            yawAngle: parseFloat(document.getElementById('yaw_angle-test1').value),
            gradient: parseFloat(document.getElementById('gradient-test1').value) / 100,
            resultElement: document.getElementById('cdaResults-test1')
        },
        {
            name: document.getElementById('test2-name').value || 'Test 2',
            distance: parseFloat(document.getElementById('distance-test2').value),
            time: document.getElementById('time-test2').value,
            power: parseFloat(document.getElementById('power-test2').value),
            windSpeed: parseFloat(document.getElementById('wind_speed-test2').value),
            yawAngle: parseFloat(document.getElementById('yaw_angle-test2').value),
            gradient: parseFloat(document.getElementById('gradient-test2').value) / 100,
            resultElement: document.getElementById('cdaResults-test2')
        },
        {
            name: document.getElementById('test3-name').value || 'Test 3',
            distance: parseFloat(document.getElementById('distance-test3').value),
            time: document.getElementById('time-test3').value,
            power: parseFloat(document.getElementById('power-test3').value),
            windSpeed: parseFloat(document.getElementById('wind_speed-test3').value),
            yawAngle: parseFloat(document.getElementById('yaw_angle-test3').value),
            gradient: parseFloat(document.getElementById('gradient-test3').value) / 100,
            resultElement: document.getElementById('cdaResults-test3')
        }
    ];

    const totalWeight = weight + bikeWeight;
    const g = 9.80665; // Gravitational constant

    let cdaValues = [];
    let wattsPerCdaValues = [];
    let testNames = [];
    let totalPower = 0;

    for (let test of tests) {
        if (!isNaN(test.distance) && test.time && !isNaN(test.power)) {
            const timeSeconds = parseTimeToSecondsTest(test.time);
            const speedMS = (test.distance * 1000) / timeSeconds; // Convert distance from km to m
            const speedKPH = (speedMS * 3.6).toFixed(2); // Convert speed to km/h
            const windSpeedMS = test.windSpeed / 3.6; // Convert wind speed from km/h to m/s
            const yawAngleRad = calculateWindYawAngle(speedMS, windSpeedMS, test.yawAngle);

            const apparentWindSpeed = Math.sqrt(Math.pow(speedMS, 2) + Math.pow(windSpeedMS, 2) + 2 * speedMS * windSpeedMS * Math.cos(yawAngleRad));
            const effectivePower = test.power * drivetrainEfficiency; // Adjust power for drivetrain efficiency
            const rollingResistanceForce = rollingResistance * totalWeight * g;
            const rollingResistancePower = rollingResistanceForce * speedMS;
            const elevationForce = totalWeight * g * test.gradient;
            const elevationPower = elevationForce * speedMS;
            const aerodynamicPower = effectivePower - rollingResistancePower - elevationPower;

            if (aerodynamicPower < 0) {
                test.resultElement.innerHTML = `<strong>${test.name} CdA:<br></strong> Invalid Data (Negative Aerodynamic Power)`;
                continue;
            }

            const directivityFunction = Math.cos(yawAngleRad) ** 2 + 1.2 * Math.sin(yawAngleRad) ** 2;
            const cda = (2 * aerodynamicPower) / (airDensity * Math.pow(apparentWindSpeed, 3) * directivityFunction);

            cdaValues.push(cda);
            testNames.push(test.name);
            totalPower += test.power;

          const wattsPerCda = Math.round(test.power / cda);
            wattsPerCdaValues.push(wattsPerCda);

           const formattedTime = secondsToHMS(timeSeconds);

            test.resultElement.innerHTML = `
                <strong>${test.name} CdA:<br></strong> ${cda.toFixed(4)}<br>
                <strong>Speed:<br></strong> ${speedKPH} km/h<br>
                <strong>Power:<br></strong> ${test.power} W<br>
                <strong>Distance:<br></strong> ${test.distance} km<br>
                <strong>Time:<br></strong> ${formattedTime}<br>
                <strong>Watts/CdA:<br></strong> ${wattsPerCda} W/m²<br>
            `;
        } else {
            test.resultElement.innerHTML = `<strong>${test.name} CdA:<br></strong> Incomplete Data`;
        }
    }

    if (cdaValues.length > 0) {
        showResults();

        const averageCdA = cdaValues.reduce((a, b) => a + b) / cdaValues.length;
        const averagePower = totalPower / cdaValues.length;
        const averageSpeed = cdaValues.reduce((total, cda, index) => total + (tests[index].distance * 1000 / parseTimeToSecondsTest(tests[index].time)) * 3.6, 0) / cdaValues.length;
        const averageWattsPerCda = Math.round(averagePower / averageCdA);

        document.getElementById('cdaResults-average').innerHTML = `
            <strong>Average CdA:<br></strong> ${averageCdA.toFixed(4)}<br>
            <strong>Average Speed:<br></strong> ${averageSpeed.toFixed(2)} km/h<br>
            <strong>Average Power:<br></strong> ${averagePower.toFixed(2)} W<br>
            <strong>Average Watts/CdA:<br></strong> ${averageWattsPerCda} W/m²
        `;

        if (cdaValues.length > 1) {
            let differences = [];

            for (let i = 0; i < cdaValues.length; i++) {
                for (let j = i + 1; j < cdaValues.length; j++) {
                    let absoluteDiff = cdaValues[j] - cdaValues[i];
                    let percentDiff = ((cdaValues[j] - cdaValues[i]) / cdaValues[i]) * 100;
                    differences.push({ test1: tests[i].name, test2: tests[j].name, absDiff: absoluteDiff, percentDiff: percentDiff });
                }
            }

            let differenceString = differences.map(d => `${d.test1} to ${d.test2}: <br>${d.absDiff.toFixed(4)} (${d.percentDiff.toFixed(2)}%)<br>`).join('<br>');
            document.getElementById('cdaResults-difference').innerHTML = `<strong>Differences:</strong> <br>${differenceString}`;

// Calculate power savings at 35 km/h, 45 km/h, and 55 km/h
const speeds = [35, 45, 55];
let powerSavingsHTML = '<strong>Power Savings:</strong><br>';

for (let i = 0; i < speeds.length; i++) {
    powerSavingsHTML += `<strong>At ${speeds[i]} km/h:</strong><br>`;
    for (let j = 0; j < cdaValues.length - 1; j++) {
        for (let k = j + 1; k < cdaValues.length; k++) {
            const power1 = Math.round(calculatePowerSavings(cdaValues[j], airDensity, speeds[i]));
            const power2 = Math.round(calculatePowerSavings(cdaValues[k], airDensity, speeds[i]));
            const powerSaved = Math.round(power1 - power2);

            powerSavingsHTML += `${tests[j].name} to ${tests[k].name}: ${powerSaved} W<br>`;
        }
    }
}

            document.getElementById('cdaResults-power-savings').innerHTML = powerSavingsHTML;
        } else {
            document.getElementById('cdaResults-difference').innerHTML = `<strong>Differences:</strong> N/A`;
            document.getElementById('cdaResults-power-savings').innerHTML = ''; // Clear power savings if less than 2 tests
        }

        document.dispatchEvent(new CustomEvent('cdaCalculated', {
            detail: {
                testNames,
                cdaValues,
                averageCdA,
                weight,
                bikeWeight
            }
        }));

        // Ensure these elements exist if needed
        if (document.getElementById('weight-race')) {
            document.getElementById('weight-race').value = weight;
        }
        if (document.getElementById('bike-weight-race')) {
            document.getElementById('bike-weight-race').value = bikeWeight;
        }
        if (document.getElementById('cda-test1')) {
            document.getElementById('cda-test1').value = cdaValues[0]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-test2')) {
            document.getElementById('cda-test2').value = cdaValues[1]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-test3')) {
            document.getElementById('cda-test3').value = cdaValues[2]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-average')) {
            document.getElementById('cda-average').value = averageCdA.toFixed(4);
        }
        if (document.getElementById('weight-ps')) {
            document.getElementById('weight-ps').value = weight;
        }
        if (document.getElementById('bike-weight-ps')) {
            document.getElementById('bike-weight-ps').value = bikeWeight;
        }
        if (document.getElementById('cda-ps-test1')) {
            document.getElementById('cda-ps-test1').value = cdaValues[0]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-ps-test2')) {
            document.getElementById('cda-ps-test2').value = cdaValues[1]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-ps-test3')) {
            document.getElementById('cda-ps-test3').value = cdaValues[2]?.toFixed(4) || '';
        }

        // Call the graph update function if it exists
        if (typeof updateGraph === 'function') {
            updateGraph(testNames, cdaValues, averageCdA, wattsPerCdaValues);
        }
    }
}

document.querySelectorAll('#weight-cda, #bike_weight-cda, #rolling_resistance-cda, #air_density-cda, #drivetrain_efficiency-cda, #distance-test1, #time-test1, #power-test1, #wind_speed-test1, #yaw_angle-test1, #gradient-test1, #distance-test2, #time-test2, #power-test2, #wind_speed-test2, #yaw_angle-test2, #gradient-test2, #distance-test3, #time-test3, #power-test3, #wind_speed-test3, #yaw_angle-test3, #gradient-test3').forEach(element => {
    element.addEventListener('input', calculateCdA);
    element.addEventListener('change', calculateCdA);
});

document.getElementById('distance-test1').addEventListener('input', () => updatePlaceholderCda(1));
document.getElementById('distance-test2').addEventListener('input', () => updatePlaceholderCda(2));
document.getElementById('distance-test3').addEventListener('input', () => updatePlaceholderCda(3));

