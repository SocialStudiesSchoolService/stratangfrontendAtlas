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
    }

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
          FontsToLoad             : [
            "g_font_1","g_font_2","g_font_3","g_font_4","g_font_5","g_font_6","g_font_7","g_font_8","g_font_9","g_font_10","g_font_11","g_font_12","g_font_13","g_font_14","g_font_15","g_font_16","g_font_17","g_font_18","g_font_19","g_font_20","g_font_21","g_font_22","g_font_23","g_font_24","g_font_25",
            "g_font_26","g_font_27","g_font_28","g_font_29","g_font_30","g_font_31","g_font_32","g_font_33","g_font_34","g_font_35","g_font_36","g_font_37","g_font_38","g_font_39","g_font_40","g_font_41","g_font_42","g_font_43","g_font_44","g_font_45","g_font_46","g_font_47","g_font_48","g_font_49","g_font_50",
            "g_font_51","g_font_52","g_font_53","g_font_54","g_font_55","g_font_56","g_font_57","g_font_58","g_font_59","g_font_60","g_font_61","g_font_62","g_font_63","g_font_64","g_font_65","g_font_66","g_font_67","g_font_68","g_font_69","g_font_70","g_font_71","g_font_72","g_font_73","g_font_74","g_font_75",
            "g_font_76","g_font_77","g_font_78","g_font_79","g_font_80","g_font_81","g_font_82","g_font_83","g_font_84","g_font_85","g_font_86","g_font_87","g_font_88","g_font_89","g_font_90","g_font_91","g_font_92","g_font_93","g_font_94","g_font_95","g_font_96","g_font_97","g_font_98","g_font_99","g_font_100",
            "g_font_101","g_font_102","g_font_103","g_font_104","g_font_105","g_font_106","g_font_107","g_font_108","g_font_109","g_font_110","g_font_111","g_font_112","g_font_113","g_font_114","g_font_115","g_font_116","g_font_117","g_font_118","g_font_119","g_font_120","g_font_121","g_font_122","g_font_123","g_font_124","g_font_125",
            "g_font_126","g_font_127","g_font_128","g_font_129","g_font_130","g_font_131","g_font_132","g_font_133","g_font_134","g_font_135","g_font_136","g_font_137","g_font_138","g_font_139","g_font_140","g_font_141","g_font_142","g_font_143","g_font_144","g_font_145","g_font_146","g_font_147","g_font_148","g_font_149","g_font_150",
            "g_font_151","g_font_152","g_font_153","g_font_154","g_font_155","g_font_156","g_font_157","g_font_158","g_font_159","g_font_160","g_font_161","g_font_162","g_font_163","g_font_164","g_font_165","g_font_166","g_font_167","g_font_168","g_font_169","g_font_170","g_font_171","g_font_172","g_font_173","g_font_174","g_font_175",
            "g_font_176","g_font_177","g_font_178","g_font_179","g_font_180","g_font_181","g_font_182","g_font_183","g_font_184","g_font_185","g_font_186","g_font_187","g_font_188","g_font_189","g_font_190","g_font_191","g_font_192","g_font_193","g_font_194","g_font_195","g_font_196","g_font_197","g_font_198","g_font_199","g_font_200",
            "g_font_201","g_font_202","g_font_203","g_font_204","g_font_205","g_font_206","g_font_207","g_font_208","g_font_209","g_font_210","g_font_211","g_font_212","g_font_213","g_font_214","g_font_215","g_font_216","g_font_217","g_font_218","g_font_219","g_font_220","g_font_221","g_font_222","g_font_223","g_font_224","g_font_225",
            "g_font_226","g_font_227","g_font_228","g_font_229","g_font_230","g_font_231","g_font_232","g_font_233","g_font_234","g_font_235","g_font_236","g_font_237","g_font_238","g_font_239","g_font_240","g_font_241","g_font_242","g_font_243","g_font_244","g_font_245","g_font_246","g_font_247","g_font_248","g_font_249","g_font_250",
            "g_font_251","g_font_252","g_font_253","g_font_254","g_font_255","g_font_256","g_font_257","g_font_258","g_font_259","g_font_260","g_font_261","g_font_262","g_font_263","g_font_264","g_font_265","g_font_266","g_font_267","g_font_268","g_font_269","g_font_270","g_font_271","g_font_272","g_font_273","g_font_274","g_font_275",
            "g_font_276","g_font_277","g_font_278","g_font_279","g_font_280","g_font_281","g_font_282","g_font_283","g_font_284","g_font_285","g_font_286","g_font_287","g_font_288","g_font_289","g_font_290","g_font_291","g_font_292","g_font_293","g_font_294","g_font_295","g_font_296","g_font_297","g_font_298","g_font_299","g_font_300",
            "g_font_301","g_font_302","g_font_303","g_font_304","g_font_305","g_font_306","g_font_307","g_font_308","g_font_309","g_font_310","g_font_311","g_font_312","g_font_313","g_font_314","g_font_315","g_font_316","g_font_317","g_font_318","g_font_319","g_font_320","g_font_321","g_font_322","g_font_323","g_font_324","g_font_325",
            "g_font_326","g_font_327","g_font_328","g_font_329","g_font_330","g_font_331","g_font_332","g_font_333","g_font_334","g_font_335","g_font_336","g_font_337","g_font_338","g_font_339","g_font_340","g_font_341","g_font_342","g_font_343","g_font_344","g_font_345","g_font_346","g_font_347","g_font_348","g_font_349","g_font_350",
            "g_font_351","g_font_352","g_font_353","g_font_354","g_font_355","g_font_356","g_font_357","g_font_358","g_font_359","g_font_360","g_font_361","g_font_362","g_font_363","g_font_364","g_font_365","g_font_366","g_font_367","g_font_368","g_font_369","g_font_370","g_font_371","g_font_372","g_font_373","g_font_374","g_font_375",
            "g_font_376","g_font_377","g_font_378","g_font_379","g_font_380","g_font_381","g_font_382","g_font_383","g_font_384","g_font_385","g_font_386","g_font_387","g_font_388","g_font_389","g_font_390","g_font_391","g_font_392","g_font_393","g_font_394","g_font_395","g_font_396","g_font_397","g_font_398","g_font_399","g_font_400",
            "g_font_401","g_font_402","g_font_403","g_font_404","g_font_405","g_font_406","g_font_407","g_font_408","g_font_409","g_font_410","g_font_411","g_font_412","g_font_413","g_font_414","g_font_415","g_font_416","g_font_417","g_font_418","g_font_419","g_font_420","g_font_421","g_font_422","g_font_423","g_font_424","g_font_425",
            "g_font_426","g_font_427","g_font_428","g_font_429","g_font_430","g_font_431","g_font_432","g_font_433","g_font_434","g_font_435","g_font_436","g_font_437","g_font_438","g_font_439","g_font_440","g_font_441","g_font_442","g_font_443","g_font_444","g_font_445","g_font_446","g_font_447","g_font_448","g_font_449","g_font_450",
            "g_font_451","g_font_452","g_font_453","g_font_454","g_font_455","g_font_456","g_font_457","g_font_458","g_font_459","g_font_460","g_font_461","g_font_462","g_font_463","g_font_464","g_font_465","g_font_466","g_font_467","g_font_468","g_font_469","g_font_470","g_font_471","g_font_472","g_font_473","g_font_474","g_font_475",
            "g_font_476","g_font_477","g_font_478","g_font_479","g_font_480","g_font_481","g_font_482","g_font_483","g_font_484","g_font_485","g_font_486","g_font_487","g_font_488","g_font_489","g_font_490","g_font_491","g_font_492","g_font_493","g_font_494","g_font_495","g_font_496","g_font_497","g_font_498","g_font_499","g_font_500",
            "g_font_501","g_font_502","g_font_503","g_font_504","g_font_505","g_font_506","g_font_507","g_font_508","g_font_509","g_font_510","g_font_511","g_font_512","g_font_513","g_font_514","g_font_515","g_font_516","g_font_517","g_font_518","g_font_519","g_font_520","g_font_521","g_font_522","g_font_523","g_font_524","g_font_525",
            "g_font_526","g_font_527","g_font_528","g_font_529","g_font_530","g_font_531","g_font_532","g_font_533","g_font_534","g_font_535","g_font_536","g_font_537","g_font_538","g_font_539","g_font_540","g_font_541","g_font_542","g_font_543","g_font_544","g_font_545","g_font_546","g_font_547","g_font_548","g_font_549","g_font_550",
            "g_font_551","g_font_552","g_font_553","g_font_554","g_font_555","g_font_556","g_font_557","g_font_558","g_font_559","g_font_560","g_font_561","g_font_562","g_font_563","g_font_564","g_font_565","g_font_566","g_font_567","g_font_568","g_font_569","g_font_570","g_font_571","g_font_572","g_font_573","g_font_574","g_font_575",
            "g_font_576","g_font_577","g_font_578","g_font_579","g_font_580","g_font_581","g_font_582","g_font_583","g_font_584","g_font_585","g_font_586","g_font_587","g_font_588","g_font_589","g_font_590","g_font_591","g_font_592","g_font_593","g_font_594","g_font_595","g_font_596","g_font_597","g_font_598","g_font_599","g_font_600",
            "g_font_601","g_font_602","g_font_603","g_font_604","g_font_605","g_font_606","g_font_607","g_font_608","g_font_609","g_font_610","g_font_611","g_font_612","g_font_613","g_font_614","g_font_615","g_font_616","g_font_617","g_font_618","g_font_619","g_font_620","g_font_621","g_font_622","g_font_623","g_font_624","g_font_625",
            "g_font_626","g_font_627","g_font_628","g_font_629","g_font_630","g_font_631","g_font_632","g_font_633","g_font_634","g_font_635","g_font_636","g_font_637","g_font_638","g_font_639","g_font_640","g_font_641","g_font_642","g_font_643","g_font_644","g_font_645","g_font_646","g_font_647","g_font_648","g_font_649","g_font_650",
            "g_font_651","g_font_652","g_font_653","g_font_654","g_font_655","g_font_656","g_font_657","g_font_658","g_font_659","g_font_660","g_font_661","g_font_662","g_font_663","g_font_664","g_font_665","g_font_666","g_font_667","g_font_668","g_font_669","g_font_670","g_font_671","g_font_672","g_font_673","g_font_674","g_font_675",
            "g_font_676","g_font_677","g_font_678","g_font_679","g_font_680","g_font_681","g_font_682","g_font_683","g_font_684","g_font_685","g_font_686","g_font_687","g_font_688","g_font_689","g_font_690","g_font_691","g_font_692","g_font_693","g_font_694","g_font_695","g_font_696","g_font_697","g_font_698","g_font_699","g_font_700",
            "g_font_701","g_font_702","g_font_703","g_font_704","g_font_705","g_font_706","g_font_707","g_font_708","g_font_709","g_font_710","g_font_711","g_font_712","g_font_713","g_font_714","g_font_715","g_font_716","g_font_717","g_font_718","g_font_719","g_font_720","g_font_721","g_font_722","g_font_723","g_font_724","g_font_725",
            "g_font_726","g_font_727","g_font_728","g_font_729","g_font_730","g_font_731","g_font_732","g_font_733","g_font_734","g_font_735","g_font_736","g_font_737","g_font_738","g_font_739","g_font_740","g_font_741","g_font_742","g_font_743","g_font_744","g_font_745","g_font_746","g_font_747","g_font_748","g_font_749","g_font_750",
            "g_font_751","g_font_752","g_font_753","g_font_754","g_font_755","g_font_756","g_font_757","g_font_758","g_font_759","g_font_760","g_font_761","g_font_762","g_font_763","g_font_764","g_font_765","g_font_766","g_font_767","g_font_768","g_font_769","g_font_770","g_font_771","g_font_772","g_font_773","g_font_774","g_font_775",
            "g_font_776","g_font_777","g_font_778","g_font_779","g_font_780","g_font_781","g_font_782","g_font_783","g_font_784","g_font_785","g_font_786","g_font_787","g_font_788","g_font_789","g_font_790","g_font_791","g_font_792","g_font_793","g_font_794","g_font_795","g_font_796","g_font_797","g_font_798","g_font_799","g_font_800",
            "g_font_801","g_font_802","g_font_803","g_font_804","g_font_805","g_font_806","g_font_807","g_font_808","g_font_809","g_font_810","g_font_811","g_font_812","g_font_813","g_font_814","g_font_815","g_font_816","g_font_817","g_font_818","g_font_819","g_font_820","g_font_821","g_font_822","g_font_823","g_font_824","g_font_825",
            "g_font_826","g_font_827","g_font_828","g_font_829","g_font_830","g_font_831","g_font_832","g_font_833","g_font_834","g_font_835","g_font_836","g_font_837","g_font_838","g_font_839","g_font_840","g_font_841","g_font_842","g_font_843","g_font_844","g_font_845","g_font_846","g_font_847","g_font_848","g_font_849","g_font_850",
            "g_font_851","g_font_852","g_font_853","g_font_854","g_font_855","g_font_856","g_font_857","g_font_858","g_font_859","g_font_860","g_font_861","g_font_862","g_font_863","g_font_864","g_font_865","g_font_866","g_font_867","g_font_868","g_font_869","g_font_870","g_font_871","g_font_872","g_font_873","g_font_874","g_font_875",
            "g_font_876","g_font_877","g_font_878","g_font_879","g_font_880","g_font_881","g_font_882","g_font_883","g_font_884","g_font_885","g_font_886","g_font_887","g_font_888","g_font_889","g_font_890","g_font_891","g_font_892","g_font_893","g_font_894","g_font_895","g_font_896","g_font_897","g_font_898","g_font_899","g_font_900",
            "g_font_901","g_font_902","g_font_903","g_font_904","g_font_905","g_font_906","g_font_907","g_font_908","g_font_909","g_font_910","g_font_911","g_font_912","g_font_913","g_font_914","g_font_915","g_font_916","g_font_917","g_font_918","g_font_919","g_font_920","g_font_921","g_font_922","g_font_923","g_font_924","g_font_925",
            "g_font_926","g_font_927","g_font_928","g_font_929","g_font_930","g_font_931","g_font_932","g_font_933","g_font_934","g_font_935","g_font_936","g_font_937","g_font_938","g_font_939","g_font_940","g_font_941","g_font_942","g_font_943","g_font_944","g_font_945","g_font_946","g_font_947","g_font_948","g_font_949","g_font_950",
            "g_font_951","g_font_952","g_font_953","g_font_954","g_font_955","g_font_956","g_font_957","g_font_958","g_font_959","g_font_960","g_font_961","g_font_962","g_font_963","g_font_964","g_font_965","g_font_966","g_font_967","g_font_968","g_font_969","g_font_970","g_font_971","g_font_972","g_font_973","g_font_974","g_font_975",
            "g_font_976","g_font_977","g_font_978","g_font_979","g_font_980","g_font_981","g_font_982","g_font_983","g_font_984","g_font_985","g_font_986","g_font_987","g_font_988","g_font_989","g_font_990","g_font_991","g_font_992","g_font_993","g_font_994","g_font_995","g_font_996","g_font_997","g_font_998","g_font_999","g_font_1000",
            "g_font_1001","g_font_1002","g_font_1003","g_font_1004","g_font_1005","g_font_1006","g_font_1007","g_font_1008","g_font_1009","g_font_1010","g_font_1011","g_font_1012","g_font_1013","g_font_1014","g_font_1015","g_font_1016","g_font_1017","g_font_1018","g_font_1019","g_font_1020","g_font_1021","g_font_1022","g_font_1023","g_font_1024","g_font_1025",
            "g_font_1026","g_font_1027","g_font_1028","g_font_1029","g_font_1030","g_font_1031","g_font_1032","g_font_1033","g_font_1034","g_font_1035","g_font_1036","g_font_1037","g_font_1038","g_font_1039","g_font_1040","g_font_1041","g_font_1042","g_font_1043","g_font_1044","g_font_1045","g_font_1046","g_font_1047","g_font_1048","g_font_1049","g_font_1050",
            "g_font_1051","g_font_1052","g_font_1053","g_font_1054","g_font_1055","g_font_1056","g_font_1057","g_font_1058","g_font_1059","g_font_1060","g_font_1061","g_font_1062","g_font_1063","g_font_1064","g_font_1065","g_font_1066","g_font_1067","g_font_1068","g_font_1069","g_font_1070","g_font_1071","g_font_1072","g_font_1073","g_font_1074","g_font_1075",
            "g_font_1076","g_font_1077","g_font_1078","g_font_1079","g_font_1080","g_font_1081","g_font_1082","g_font_1083","g_font_1084","g_font_1085","g_font_1086","g_font_1087","g_font_1088","g_font_1089","g_font_1090","g_font_1091","g_font_1092","g_font_1093","g_font_1094","g_font_1095","g_font_1096","g_font_1097","g_font_1098","g_font_1099","g_font_1100",
            "g_font_1101","g_font_1102","g_font_1103","g_font_1104","g_font_1105","g_font_1106","g_font_1107","g_font_1108","g_font_1109","g_font_1110","g_font_1111","g_font_1112","g_font_1113","g_font_1114","g_font_1115","g_font_1116","g_font_1117","g_font_1118","g_font_1119","g_font_1120","g_font_1121","g_font_1122","g_font_1123","g_font_1124","g_font_1125",
            "g_font_1126","g_font_1127","g_font_1128","g_font_1129","g_font_1130","g_font_1131","g_font_1132","g_font_1133","g_font_1134","g_font_1135","g_font_1136","g_font_1137","g_font_1138","g_font_1139","g_font_1140","g_font_1141","g_font_1142","g_font_1143","g_font_1144","g_font_1145","g_font_1146","g_font_1147","g_font_1148","g_font_1149","g_font_1150",
            "g_font_1151","g_font_1152","g_font_1153","g_font_1154","g_font_1155","g_font_1156","g_font_1157","g_font_1158","g_font_1159","g_font_1160","g_font_1161","g_font_1162","g_font_1163","g_font_1164","g_font_1165","g_font_1166","g_font_1167","g_font_1168","g_font_1169","g_font_1170","g_font_1171","g_font_1172","g_font_1173","g_font_1174","g_font_1175",
            "g_font_1176","g_font_1177","g_font_1178","g_font_1179","g_font_1180","g_font_1181","g_font_1182","g_font_1183","g_font_1184","g_font_1185","g_font_1186","g_font_1187","g_font_1188","g_font_1189","g_font_1190","g_font_1191","g_font_1192","g_font_1193","g_font_1194","g_font_1195","g_font_1196","g_font_1197","g_font_1198","g_font_1199","g_font_1200",
            "g_font_1201","g_font_1202","g_font_1203","g_font_1204","g_font_1205","g_font_1206","g_font_1207","g_font_1208","g_font_1209","g_font_1210","g_font_1211","g_font_1212","g_font_1213","g_font_1214","g_font_1215","g_font_1216","g_font_1217","g_font_1218","g_font_1219","g_font_1220","g_font_1221","g_font_1222","g_font_1223","g_font_1224","g_font_1225"
          ],
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