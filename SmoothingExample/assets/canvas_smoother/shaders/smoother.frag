#include frex:shaders/api/header.glsl
#include frex:shaders/api/world.glsl

/******************************************************
  canvas_smoother:shaders/smoother.frag
******************************************************/

/* Uniforms
 ************************************/

uniform sampler2D u_previous;

uniform ivec2 frxu_size;

/* In / Out
 ************************************/

in vec2 _cvv_texcoord;

out float smoothedOutput;

/* Consts
 ************************************/

const int TIME_INDEX = 3;
const float CLEAR_VALUE = 1.0;

const int SMOOTHING_FRAMES = 240;

// using raw frames actually isn't a very good idea (low vs high framerate).... but it's what Canvas use
float smoothOverFrames(float prev, float current) {
	// we use float here but in version 400 we can use double for better precision
	// since this pipeline is based on canvas we're stuck with 330
	const float ALPHA = 1.0 - exp(-1.0 / float(SMOOTHING_FRAMES));

	return prev * (1.0 - ALPHA) + ALPHA * current;
}

const int TARGET_FRAMERATE = 60;

float smoothOverTimeWtf(float prev, float current, float minVal, float maxVal, float deltaTime) {
	// apply framerate correction. not super accurate but better?
	const float TARGET_DELTA_TIME = 1.0 / float(TARGET_FRAMERATE);

	float smoothed = smoothOverFrames(prev, current);

	// lerping an exponentially smoothed number can't be good..
	smoothed = mix(prev, smoothed, deltaTime / TARGET_DELTA_TIME);

	// this can overshoot, therefore requires clamping
	return clamp(smoothed, minVal, maxVal);
}

const float SMOOTHING_SECONDS = SMOOTHING_FRAMES / TARGET_FRAMERATE;

float smoothOverTime(float prev, float current, float minVal, float maxVal, float deltaTime) {
	// https://en.wikipedia.org/wiki/Exponential_smoothing#Time_constant
	// https://www.construct.net/en/blogs/ashleys-blog-2/using-lerp-delta-time-924
	float alpha = 1.0 - exp(-deltaTime / SMOOTHING_SECONDS);

	float smoothed = prev * (1.0 - alpha) + alpha * current;

	// this can overshoot, therefore requires clamping
	return clamp(smoothed, minVal, maxVal);
}

/* Main
 ************************************/

void main() {
	vec2 pixelSize = 1.0 / vec2(frxu_size);
	vec2 centeredTexCoord = (_cvv_texcoord * (1.0 - pixelSize)) + pixelSize * 0.5;
	ivec2 texelCoord = ivec2(centeredTexCoord * vec2(frxu_size));

	int var_index = texelCoord.x;
	float var_previous = texelFetch(u_previous, ivec2(var_index, 0), 0).r;
	float var_current = 1.0;

	// special index for storing time. this is optional if you don't need delta time. note that this requires a 32F buffer
	if (var_index == TIME_INDEX) {
		smoothedOutput = frx_renderSeconds;
		return;
	}

	// delta time might not be super accurate when renderSeconds get a high float value (the player really should take breaks)
	float deltaTime = frx_renderSeconds - texelFetch(u_previous, ivec2(TIME_INDEX, 0), 0).r;

	// I guess this is why compute shader is preferred: fragment doesn't like switching!
	// But the perf loss should be NEGLIGIBLE considering we only have a tiny amount of variable,
	// compared to the capability of the target hardware.
	switch (var_index) {
		case 0:
			var_current = 1.0 - frx_rainGradient;
			break;
		case 1:
			var_current = 1.0 - frx_worldIsMoonlit;
			break;
		case 2:
			var_current = 1.0 - frx_cameraInWater;
			break;
	}

	bool isClearFrame = (frx_renderFrames <= 1u);

	// smoothedOutput = isClearFrame ? CLEAR_VALUE : smoothOverFrames(var_previous, var_current);

	smoothedOutput = isClearFrame ? CLEAR_VALUE : smoothOverTime(var_previous, var_current, 0.0, 1.0, deltaTime);
}
