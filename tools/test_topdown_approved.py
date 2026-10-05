"""승인 범위·해시·메타·키트 좌표가 변하면 거부하는 검사."""
import unittest
from topdown_approved import load, validate_manifest, verify


class ApprovalTests(unittest.TestCase):
    def setUp(self): self.spec=load()

    def test_real_products_and_sources(self): verify(self.spec,True)

    def test_superseded_candidate(self):
        self.spec['entries'][1]['candidate']='assets/raw/topdown-v3/candidates/map-cell-v1.webp'
        with self.assertRaises(ValueError):validate_manifest(self.spec)

    def test_wrong_hash(self):
        self.spec['entries'][0]['approved_sha256']='0'*64
        with self.assertRaises(ValueError):verify(self.spec,True)

    def test_wrong_original_hash(self):
        self.spec['entries'][0]['original_sha256']='0'*64
        with self.assertRaises(ValueError):verify(self.spec,True)

    def test_wrong_frame_count(self):
        self.spec['entries'][4]['sprite']['frames']=4
        with self.assertRaises(ValueError):validate_manifest(self.spec)

    def test_wrong_foot(self):
        self.spec['entries'][4]['sprite']['anchor']['y']=29
        with self.assertRaises(ValueError):validate_manifest(self.spec)

    def test_wrong_direction(self):
        self.spec['entries'][4]['sprite']['directions']['up']['row']=4
        with self.assertRaises(ValueError):validate_manifest(self.spec)

    def test_valid_but_swapped_direction_rows(self):
        d=self.spec['entries'][4]['sprite']['directions']
        d['left']['row'],d['right']['row']=d['right']['row'],d['left']['row']
        with self.assertRaises(ValueError):validate_manifest(self.spec)

    def test_wrong_crop(self):
        self.spec['derived'][0]['crop'][2]=31
        with self.assertRaises(ValueError):validate_manifest(self.spec)

    def test_changed_crop_pixels(self):
        self.spec['derived'][0]['pixel_sha256']='0'*64
        with self.assertRaises(ValueError):verify(self.spec,True)

    def test_wrong_review(self):
        self.spec['review']['sha256']='0'*64
        with self.assertRaises(ValueError):verify(self.spec,True)


if __name__=='__main__':unittest.main()
