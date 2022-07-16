#include frex:shaders/api/header.glsl

/******************************************************
  canvas_smoother:shaders/test_fade.frag
******************************************************/

uniform sampler2D u_base;
uniform sampler2D u_smoothed_vars;

in vec2 _cvv_texcoord;

out vec4 fragColor;

void main() {
	// this is for testing only, actual access would use the indexer as demonstrated in smoother.frag
	float var = texture(u_smoothed_vars, _cvv_texcoord * vec2(3.0 / 4.0, 1.0)).r;
	vec4 base = texture(u_base, _cvv_texcoord);
	fragColor = base * var;
}
