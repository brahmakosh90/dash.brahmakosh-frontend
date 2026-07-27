// vite.config.js
import { defineConfig } from "file:///C:/Users/user/Desktop/Brahmkosh/frontend/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/user/Desktop/Brahmkosh/frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///C:/Users/user/Desktop/Brahmkosh/frontend/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
var suppress = ["ECONNRESET", "ECONNREFUSED", "EPIPE"];
var vite_config_default = defineConfig({
  plugins: [vue(), vueJsx()],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Cross-Origin-Embedder-Policy": "unsafe-none"
    },
    // Use a separate port for Vite HMR so it never conflicts with /socket.io proxy
    hmr: { port: 5174 },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            if (!suppress.includes(err.code)) console.log("api proxy error", err.message);
          });
        }
      },
      // Handles BOTH Engine.IO HTTP polling (/socket.io/?transport=polling)
      // AND WebSocket upgrade (/socket.io/?transport=websocket)
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true,
        rewriteWsOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            if (!suppress.includes(err.code)) console.log("socket proxy error", err.message);
          });
          proxy.on("proxyReqWs", (proxyReq) => {
            proxyReq.setHeader("origin", "http://localhost:5000");
          });
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1c2VyXFxcXERlc2t0b3BcXFxcQnJhaG1rb3NoXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1c2VyXFxcXERlc2t0b3BcXFxcQnJhaG1rb3NoXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91c2VyL0Rlc2t0b3AvQnJhaG1rb3NoL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXHJcbmltcG9ydCB2dWVKc3ggZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlLWpzeCdcclxuXHJcbmNvbnN0IHN1cHByZXNzID0gWydFQ09OTlJFU0VUJywgJ0VDT05OUkVGVVNFRCcsICdFUElQRSddO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbdnVlKCksIHZ1ZUpzeCgpXSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0Nyb3NzLU9yaWdpbi1PcGVuZXItUG9saWN5JzogJ3Vuc2FmZS1ub25lJyxcclxuICAgICAgJ0Nyb3NzLU9yaWdpbi1FbWJlZGRlci1Qb2xpY3knOiAndW5zYWZlLW5vbmUnLFxyXG4gICAgfSxcclxuICAgIC8vIFVzZSBhIHNlcGFyYXRlIHBvcnQgZm9yIFZpdGUgSE1SIHNvIGl0IG5ldmVyIGNvbmZsaWN0cyB3aXRoIC9zb2NrZXQuaW8gcHJveHlcclxuICAgIGhtcjogeyBwb3J0OiA1MTc0IH0sXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4ge1xyXG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVycikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIXN1cHByZXNzLmluY2x1ZGVzKGVyci5jb2RlKSkgY29uc29sZS5sb2coJ2FwaSBwcm94eSBlcnJvcicsIGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIEhhbmRsZXMgQk9USCBFbmdpbmUuSU8gSFRUUCBwb2xsaW5nICgvc29ja2V0LmlvLz90cmFuc3BvcnQ9cG9sbGluZylcclxuICAgICAgLy8gQU5EIFdlYlNvY2tldCB1cGdyYWRlICgvc29ja2V0LmlvLz90cmFuc3BvcnQ9d2Vic29ja2V0KVxyXG4gICAgICAnL3NvY2tldC5pbyc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgIHdzOiB0cnVlLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICByZXdyaXRlV3NPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4ge1xyXG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVycikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIXN1cHByZXNzLmluY2x1ZGVzKGVyci5jb2RlKSkgY29uc29sZS5sb2coJ3NvY2tldCBwcm94eSBlcnJvcicsIGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxV3MnLCAocHJveHlSZXEpID0+IHtcclxuICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdvcmlnaW4nLCAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJyk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1QsU0FBUyxvQkFBb0I7QUFDblYsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sWUFBWTtBQUVuQixJQUFNLFdBQVcsQ0FBQyxjQUFjLGdCQUFnQixPQUFPO0FBRXZELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO0FBQUEsRUFDekIsUUFBUTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1AsOEJBQThCO0FBQUEsTUFDOUIsZ0NBQWdDO0FBQUEsSUFDbEM7QUFBQTtBQUFBLElBRUEsS0FBSyxFQUFFLE1BQU0sS0FBSztBQUFBLElBQ2xCLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFdBQVcsQ0FBQyxVQUFVO0FBQ3BCLGdCQUFNLEdBQUcsU0FBUyxDQUFDLFFBQVE7QUFDekIsZ0JBQUksQ0FBQyxTQUFTLFNBQVMsSUFBSSxJQUFJLEVBQUcsU0FBUSxJQUFJLG1CQUFtQixJQUFJLE9BQU87QUFBQSxVQUM5RSxDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQTtBQUFBO0FBQUEsTUFHQSxjQUFjO0FBQUEsUUFDWixRQUFRO0FBQUEsUUFDUixJQUFJO0FBQUEsUUFDSixjQUFjO0FBQUEsUUFDZCxpQkFBaUI7QUFBQSxRQUNqQixRQUFRO0FBQUEsUUFDUixXQUFXLENBQUMsVUFBVTtBQUNwQixnQkFBTSxHQUFHLFNBQVMsQ0FBQyxRQUFRO0FBQ3pCLGdCQUFJLENBQUMsU0FBUyxTQUFTLElBQUksSUFBSSxFQUFHLFNBQVEsSUFBSSxzQkFBc0IsSUFBSSxPQUFPO0FBQUEsVUFDakYsQ0FBQztBQUNELGdCQUFNLEdBQUcsY0FBYyxDQUFDLGFBQWE7QUFDbkMscUJBQVMsVUFBVSxVQUFVLHVCQUF1QjtBQUFBLFVBQ3RELENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
