"""잘림·발 기준·잘못된 걷기 메타를 거부하는 후보 검사 회귀."""
import unittest
import numpy as np
from PIL import Image

from process_topdown_candidates import validate_sheet, validate_metadata, fit_frames


def meta():
    return dict(kind="walk", width=160, height=128, frames=5, rows=4,
                cell=dict(width=32, height=32), anchor=dict(x=16, y=30),
                directions={d:dict(row=i, stand=0, walk=[1,2,3,4]) for i,d in enumerate(["down","left","right","up"])})


def fixture():
    a = np.zeros((128,160,4), dtype=np.uint8)
    for row in range(4):
        for col in range(5):
            a[row*32+3:row*32+31,col*32+12:col*32+21] = [70,80,90,255]
            a[row*32+10,col*32+12+col] = [90+col*20,40+row*10,30,255]
    return Image.fromarray(a, "RGBA")


class CandidateTests(unittest.TestCase):
    def test_valid_sheet(self):
        self.assertEqual(len(validate_sheet(fixture(), meta())), 20)

    def test_wrong_frame_reference(self):
        m = meta(); m["directions"]["up"]["walk"] = [1,2,3,5]
        with self.assertRaises(ValueError): validate_metadata(m)

    def test_missing_direction(self):
        m = meta(); del m["directions"]["left"]
        with self.assertRaises(ValueError): validate_metadata(m)

    def test_foot_drift(self):
        a = np.array(fixture()); a[30,:32] = 0
        with self.assertRaises(ValueError): validate_sheet(Image.fromarray(a), meta())

    def test_edge_clipping(self):
        a = np.array(fixture()); a[10,0] = [70,80,90,255]
        with self.assertRaises(ValueError): validate_sheet(Image.fromarray(a), meta())

    def test_identical_walk(self):
        a = np.array(fixture())
        for col in range(1,5): a[:32,col*32:(col+1)*32] = a[:32,:32]
        with self.assertRaises(ValueError): validate_sheet(Image.fromarray(a), meta())

    def test_wrong_size_and_palette(self):
        with self.assertRaises(ValueError): validate_sheet(fixture().resize((161,128)), meta())
        a = np.array(fixture())
        for i in range(40): a[5+i//9,12+i%9] = [i*5,i,100,255]
        with self.assertRaises(ValueError): validate_sheet(Image.fromarray(a), meta())

    def test_no_silent_clipping_during_fit(self):
        frame = Image.new("RGBA", (300,280), (40,50,60,255))
        with self.assertRaises(ValueError): fit_frames([[frame]*5]*4, meta())

    def test_foot_band_matches_final_cell(self):
        frame=Image.new("RGBA",(20,28),(70,80,90,255))
        a=np.array(frame)
        a[24:,:10]=0
        fitted=fit_frames([[Image.fromarray(a)]*5]*4,meta())
        foot=np.array(fitted.crop((0,0,32,32)))
        xs=np.nonzero(foot[28:,...,3]>100)[1]
        self.assertLessEqual(abs(float(np.median(xs))-16),1)

    def test_bad_source_frame_count(self):
        frame=Image.new("RGBA",(20,28),(70,80,90,255))
        with self.assertRaises(ValueError): fit_frames([[frame]*4]*4,meta())


if __name__ == "__main__":
    unittest.main()
