(function IntegroAtlases () {
  const BASE_URL = 'https://stratang-backend.integ.ro';
  const BASE_API_URL = BASE_URL + '/api';

  const ALL_API_URL = {
    'authenticate:POST': {
      url: `${BASE_API_URL}/authenticate`,
      method: 'post',
      useToken: false
    },
    'atlases:GET': {
      url: `${BASE_API_URL}/atlas`,
      method: 'get',
      useToken: true
    }
  };

  window.onload = function () {
    function $a () {
      return new $atlases();
    }
    const $atlases = function () {
      this.arrayDom = document.querySelectorAll('[data-integro-atlases="true"]');
      this._init();
    };
    $atlases.prototype._init = function (){
      this._authenticate();
      // (this.arrayDom).forEach(function (elementDom){ self._loadPdf(elementDom); });
    };

    $atlases.prototype._authenticate = function (){

      const userToken = localStorage.getItem('userToken');
      const self=this;
      const password='!"·$%&';
      const username='nystrom_maps_system';
      const rememberMe=true;

      if (userToken && userToken !== '') return this._fetchAtlases();

      this._fetch('authenticate:POST', { password: password, username: username, rememberMe: rememberMe }, function (response){
        localStorage.setItem('userToken', response.id_token);
        self._fetchAtlases();
      });
    };

    $atlases.prototype._fetchAtlases = function (){
      const self = this;
      this._fetch('atlases:GET', '?sort=id', function (atlases){
        let idViewAtlas = 1;
        console.log('resposne attlases', atlases);

        const urlParams = self._captureUrlParams();
        if (urlParams.atlas) idViewAtlas = urlParams.atlas;
        const atlas = atlases[idViewAtlas];
        (self.arrayDom).forEach(function (elementDom){ self._loadPdf(elementDom, atlas); });
      });
    };

    $atlases.prototype._fetch = function (api, data, callback){
      const url = ALL_API_URL[api].url;
      const method = ALL_API_URL[api].method;
      const useToken = ALL_API_URL[api].useToken;

      const paramsAjax = {
        url: url,
        type: method,
        dataType: 'json',
        contentType: 'application/json',
        success: function (response){ callback(response); }
      };

      if (method !== 'get') paramsAjax.data = JSON.stringify(data);
      else paramsAjax.url += data;

      if (useToken) {
        const token = localStorage.getItem('userToken');
        if (token && token !== '') paramsAjax.headers = { Authorization: 'Bearer ' + token };
      }

      $.ajax(paramsAjax);
    };

    $atlases.prototype._captureUrlParams = function () {
      const urlString = window.location.href
      const urlFormat = new URL(urlString);
      let atlas = urlFormat.searchParams.get("atlas");
      if (atlas && atlas !== '') atlas = atlas.replace(/[^\d]/g, '')

      return { atlas: atlas };
    };

    $atlases.prototype._loadPdf = function (elementDom, dataAtlas) {
      const idParent = elementDom.id;
      const uriAtlases = dataAtlas.uri;
      const keyAtlases = dataAtlas.key;
      const nameAtlases = dataAtlas.name;
      const keyReloadAtlases = dataAtlas.keyReload;
      // const keyAtlases = elementDom.getAttribute('data-key-atlas');
      // const nameAtlases = elementDom.getAttribute('data-name-atlas');
      if (!idParent || idParent === '' || !keyAtlases || keyAtlases === '' || !nameAtlases || nameAtlases === '') return; // div without id, key and name atlas
      const idViewer = idParent + '-viewer';

      elementDom.insertAdjacentHTML(
        'beforeend',
        '<div id="' + idViewer + '" class="flowpaper_viewer" style="position:absolute; width:100%; height:100%; background-color:#222222;"></div>'
      );

      console.log('url completessss ---', uriAtlases + nameAtlases + '.pdf?reload=' + keyAtlases);

      $('#' + idViewer + '').FlowPaperViewer({
        config : {
          PDFFile                 : uriAtlases + nameAtlases + '.pdf?reload=' + keyReloadAtlases,
          IMGFiles                : uriAtlases + nameAtlases + '.pdf_{page}.jpg?reload=' + keyReloadAtlases,
          HighResIMGFiles         : '',
          JSONFile                : uriAtlases + nameAtlases + '.pdf_{page}.bin?reload=' + keyReloadAtlases,
          JSONDataType            : 'lz',
          ThumbIMGFiles           : uriAtlases + nameAtlases + '.pdf_{page}_thumb.jpg?reload=' + keyReloadAtlases,
          SWFFile                 : '',
          FontsToLoad             : null,

          Scale                   : 0.1,
          ZoomTransition          : 'easeOut',
          ZoomTime                : 0.4,
          ZoomInterval            : 0.1,
          FitPageOnLoad           : true,
          FitWidthOnLoad          : false,
          AutoAdjustPrintSize     : true,
          PrintPaperAsBitmap      : false,
          AutoDetectLinks         : true,
          ImprovedAccessibility   : false,
          FullScreenAsMaxWindow   : false,
          ProgressiveLoading      : false,
          MinZoomSize             : 0.1,
          MaxZoomSize             : 10,
          SearchMatchAll          : true,
          InitViewMode            : 'Zine',
          RTLMode                 : false,
          RenderingOrder          : 'html,html',
          StartAtPage             : 1,
          EnableWebGL             : false,
          PreviewMode             : '',
          PublicationTitle        : '',
          LinkTarget              : 'New window',
          MixedMode               : true,

          UIConfig                : uriAtlases + 'UI_Zine.xml?reload=' + keyReloadAtlases,
          BrandingLogo            : '',
          BrandingUrl             : '',

          WMode                   : 'transparent',

          key                     : keyAtlases,
          TrackingNumber          : '',
          localeDirectory         : 'locale/',
          localeChain             : 'en_US'
        }
      });
    };
    $a();
  };
})();